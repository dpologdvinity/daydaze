"""Hair styles refitted from downloaded hair-card packs (CC-BY, see
docs/assets.md): Hair Pack parts 1-3 by rendysix. Each pack is one GLB with a
styled head of hair per armature: strand cards (an alpha-cut strand atlas)
plus a scalp cap that shares the atlas.

For every style this module

  * pulls the hair and scalp meshes out of the pack at their rest pose
    (hair ties, bands and beads are coloured accessories the client would
    tint like hair, so they are left out),
  * greys the atlas (the client tints it with look.hairColor) and bleeds its
    colour into the transparent texels, so no bright fringe is left to
    show at the edge of a card,
  * maps the pack's scalp box onto our head's box (the woman's or the man's:
    DOLL_SEX picks which build this is) so the hair sits on our skull,
  * rides every vertex on its nearest head-skin vertex, like the other
    hairs, so bones and shape keys move it with the head.

Each style is one object named Hair_<id> (ids match HAIR_STYLES in
src/game/look.ts). `build(ctx)` returns the objects; HAIR_PACKS names the
directory the packs were unzipped into (one folder per pack).
"""

import os

import bpy
import numpy as np
from mathutils.kdtree import KDTree

import proxies

PACK_DIR = os.environ.get("HAIR_PACKS", "/tmp/hair")
PACKS = {
    "p1": "hair-pack-part-1/source/HairPackPT1.glb",
    "p2": "hair-pack-part-2/source/HairPackPT2.glb",
    "p3": "hair-pack-part-3/source/HairPackPT3.glb",
}

# Style id -> (pack, armature number, options). Options:
#   swing: offset from the head joint (Blender space) where the tail starts
#          to sway on the pony bone
#   ratio: Decimate ratio for cards that are denser than they need to be
STYLES = {
    # women's, longest first
    "rapunzel": ("p2", 110, {}),
    "long-waves": ("p2", 109, {}),
    "fishtail": ("p3", 301, {"swing": (0.0, 0.075, -0.03)}),
    "layered-long": ("p1", 1, {}),
    "sleek-side": ("p2", 104, {}),
    "high-pony": ("p2", 105, {"swing": (0.0, 0.07, 0.07)}),
    "twin-tails": ("p2", 107, {}),
    "lob": ("p2", 103, {}),
    "blunt-bob": ("p2", 106, {}),
    "sidebob": ("p2", 100, {}),
    "side-fringe": ("p2", 101, {}),
    "messy-bun": ("p2", 112, {}),
    # short cuts, for either sex
    "quiff": ("p1", 0, {}),
    "side-part": ("p1", 2, {}),
    "tousled": ("p1", 3, {}),
    "messy-curls": ("p2", 102, {}),
    "crew": ("p3", 201, {}),
    "slick-back": ("p3", 200, {}),
    "mop": ("p1", 5, {}),
    "pompadour": ("p1", 8, {}),
    "mohawk": ("p1", 9, {}),
    "spiky-crop": ("p1", 13, {}),
}

# pieces that are coloured accessories, not hair
ACCESSORIES = ("HairTie", "HairBand", "Hairband", "HairBeads")

# the hair sits a little outside the skull it was made for
CROWN_LIFT = float(os.environ.get("HAIR_LIFT", "0.01"))
GROW = float(os.environ.get("HAIR_GROW", "1.035"))


def _image_of(mesh_ob):
    """The first image texture node's image on any of a mesh's materials."""
    for m in mesh_ob.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image:
                    return n.image
    return None


def _pixels(img):
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)


_cache = {}


def _load_pack(key):
    """{armature number: {"hair": [...], "scalp": [...]}} where each part is
    (world verts, faces, per-loop uvs, atlas pixels), read once per run."""
    if key in _cache:
        return _cache[key]
    before = {o.name for o in bpy.context.scene.objects}
    bpy.ops.import_scene.gltf(filepath=os.path.join(PACK_DIR, PACKS[key]))
    parts = {}
    for ob in [o for o in bpy.context.scene.objects if o.name not in before]:
        if ob.type != "MESH" or ob.parent is None or ob.parent.type != "ARMATURE":
            continue
        num = int("".join(c for c in ob.parent.name if c.isdigit()))
        if ob.name.startswith(ACCESSORIES):
            continue
        me = ob.data
        co = np.array([(ob.matrix_world @ v.co)[:] for v in me.vertices])
        faces = [list(p.vertices) for p in me.polygons]
        uvs = np.array([l.uv[:] for l in me.uv_layers.active.data])
        img = _image_of(ob)
        kind = "scalp" if ob.name.startswith("Scalp") else "hair"
        parts.setdefault(num, {"hair": [], "scalp": []})[kind].append(
            (co, faces, uvs, None if img is None else _pixels(img))
        )
    for ob in [o for o in bpy.context.scene.objects if o.name not in before]:
        bpy.data.objects.remove(ob)
    _cache[key] = parts
    return parts


def grey_atlas(px, name):
    """A strand atlas the client can tint: luminance only, brightened to a
    steady mean, with the colour of the transparent texels flooded in from
    the opaque ones. Filtering mixes a texel with its neighbours, so a
    transparent neighbour's stray colour (white, usually) would otherwise
    ring every card and glitter against dark hair."""
    rgb, a = px[..., :3], px[..., 3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    solid = a > 0.5
    if solid.any():
        lum = np.clip(lum * (0.8 / max(float(lum[solid].mean()), 0.05)), 0, 1)
    # flood: repeatedly spread the colour of opaque texels into empty ones
    # (np.roll wraps at the borders, which is fine for an atlas with a margin)
    filled = solid.copy()
    col = np.where(solid, lum, 0.0)
    for _ in range(24):
        if filled.all():
            break
        total = np.zeros_like(col)
        count = np.zeros_like(col)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            f = np.roll(filled, (dy, dx), (0, 1))
            total += np.where(f, np.roll(col, (dy, dx), (0, 1)), 0.0)
            count += f
        grow = ~filled & (count > 0)
        col = np.where(grow, total / np.maximum(count, 1), col)
        filled |= grow
    col = np.where(filled, col, 0.8)
    out = np.empty_like(px)
    out[..., 0] = out[..., 1] = out[..., 2] = col
    out[..., 3] = a
    h, w = a.shape
    im = bpy.data.images.new(name, w, h, alpha=True)
    im.pixels.foreach_set(out.ravel())
    im.pack()
    return im


def head_box(ctx):
    """Min and max corners of our head from the brow up (Blender space)."""
    head = np.unique(np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.98]))
    pts = ctx.PB[head]
    pts = pts[pts[:, 2] > ctx.JB["lEye"][2] - 0.02]
    return pts.min(axis=0), pts.max(axis=0)


def fit(ctx, co, scalp):
    """Maps the pack's scalp box onto our head's box: width and depth match,
    the height follows their mean (a head keeps its shape), and the crowns
    meet. Hair below the scalp hangs on in proportion."""
    slo, shi = scalp.min(axis=0), scalp.max(axis=0)
    lo, hi = head_box(ctx)
    kx = (hi[0] - lo[0]) / (shi[0] - slo[0])
    ky = (hi[1] - lo[1]) / (shi[1] - slo[1])
    kz = (kx + ky) / 2
    k = np.array([kx, ky, kz]) * GROW
    centre_s = (slo + shi) / 2
    centre_h = (lo + hi) / 2
    out = (co - centre_s) * k + centre_h
    # crowns meet: the scalp's top lands on the head's top
    # (a little above it: a cap flatter than the skull would let it through)
    out[:, 2] += (hi[2] - centre_h[2]) - (shi[2] - centre_s[2]) * k[2] + CROWN_LIFT
    return out


def build_style(ctx, sid, pack, num, opts, mat_cache):
    parts = _load_pack(pack)[num]
    pieces = parts["hair"] + parts["scalp"]
    scalp = np.concatenate([p[0] for p in parts["scalp"]])
    img = next(p[3] for p in pieces if p[3] is not None)
    mat = proxies.textured(f"hair_{sid}", grey_atlas(img, f"hair_{sid}"), alpha=True)
    verts, faces, uvs, base = [], [], [], 0
    for co, fs, uv, _ in pieces:
        verts.append(co)
        faces += [[i + base for i in f] for f in fs]
        uvs.append(uv)
        base += len(co)
    co = fit(ctx, np.concatenate(verts), scalp)
    ob = ctx.new_object(f"Hair_{sid}", co, faces)
    ob.data.materials.append(mat)
    uv_layer = ob.data.uv_layers.new(name="UVMap")
    uv_layer.data.foreach_set("uv", np.concatenate(uvs).ravel())
    for p in ob.data.polygons:
        p.use_smooth = True
    if opts.get("ratio"):
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.ratio = opts["ratio"]
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
        co = np.array([v.co[:] for v in ob.data.vertices])
    skin = np.unique(np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.5]))
    tree = KDTree(len(skin))
    for i, p in enumerate(ctx.PB[skin]):
        tree.insert(p, i)
    tree.balance()
    near = skin[[tree.find(p)[1] for p in co]]
    proxies.attach(ctx, ob, ctx.W[near], {k: d[near] for k, d in ctx.KEYS.items()})
    if "swing" in opts:
        import doll_hair

        doll_hair.swing(ctx, ob, ctx.JB["head"] + np.array(opts["swing"]))
    return ob


def build(ctx):
    only = [s for s in os.environ.get("PACK_ONLY", "").split(",") if s]
    out = []
    for sid, (pack, num, opts) in STYLES.items():
        if only and sid not in only:
            continue
        out.append(build_style(ctx, sid, pack, num, opts, None))
    return out
