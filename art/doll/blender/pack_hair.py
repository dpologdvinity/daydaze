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
from mathutils import Vector
from mathutils.bvhtree import BVHTree
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
#   solid_scalp: make the scalp cap's atlas texels opaque (its alpha fades out
#          into bald patches on our heads)
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
    "crew": ("p3", 201, {"solid_scalp": True}),
    "slick-back": ("p3", 200, {}),
    "mop": ("p1", 5, {}),
    "pompadour": ("p1", 8, {}),
    "mohawk": ("p1", 9, {}),
    "spiky-crop": ("p1", 13, {}),
}

# pieces that are coloured accessories, not hair
ACCESSORIES = ("HairTie", "HairBand", "Hairband", "HairBeads")

# triangle budget of a near-LOD style; the -lo twin is a fifth of it (about 1.6k)
TRI_BUDGET = int(os.environ.get("HAIR_TRIS", "6500"))

ALPHA_LEVELS = int(os.environ.get("HAIR_ALPHA_LEVELS", "15"))

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


def scalp_mask(scalp_parts, h, w):
    """Texels covered by the scalp cap's UV triangles, as a bool (h, w) mask.
    Some packs fade the cap's alpha out toward the hairline in a way meant for
    their own skin, which on our heads shows as bald patches."""
    mask = np.zeros((h, w), bool)
    for _, faces, uvs, _ in scalp_parts:
        loop = 0
        for f in faces:
            # Blender pixel rows run bottom-up like v, as the atlas array does
            pts = uvs[loop : loop + len(f)] * np.array([w, h])
            loop += len(f)
            for k in range(1, len(f) - 1):
                tri = np.array([pts[0], pts[k], pts[k + 1]])
                x0, y0 = np.floor(tri.min(0)).astype(int) - 1
                x1, y1 = np.ceil(tri.max(0)).astype(int) + 1
                x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, w - 1), min(y1, h - 1)
                gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
                (ax, ay), (bx, by), (cx, cy) = tri
                den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
                if abs(den) < 1e-9:
                    continue
                l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
                l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
                inside = (l1 >= -0.05) & (l2 >= -0.05) & (1 - l1 - l2 >= -0.05)
                mask[y0 : y1 + 1, x0 : x1 + 1] |= inside
    return mask


def grey_atlas(px, name, solid_mask=None):
    """A strand atlas the client can tint: luminance only, brightened to a
    steady mean, with the colour of the transparent texels flooded in from
    the opaque ones. Filtering mixes a texel with its neighbours, so a
    transparent neighbour's stray colour (white, usually) would otherwise
    ring every card and glitter against dark hair."""
    rgb, a = px[..., :3], px[..., 3]
    # 16 alpha levels: webp stores alpha losslessly, and fine strand edges at
    # full depth are most of a hair file's download (alpha-to-coverage shows no difference)
    if solid_mask is not None:
        a = np.where(solid_mask, 1.0, a)
    a = np.round(a * ALPHA_LEVELS) / ALPHA_LEVELS
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


def clear_of_skin(ctx, co, clearance=0.002, reach=0.03):
    """Pushes hair vertices that ended up inside the head back out. A cap cut
    for another skull sinks into ours here and there, and the skin shows
    through as bald patches. Each vertex within `reach` of the head's skin
    keeps at least `clearance` meters of radial distance from the head's
    center above the nearest skin vertex."""
    lo, hi = head_box(ctx)
    centre = (lo + hi) / 2
    skin = np.unique(np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.5]))
    pts = ctx.PB[skin]
    tree = KDTree(len(pts))
    for i, q in enumerate(pts):
        tree.insert(q, i)
    tree.balance()
    out = co.copy()
    pushed = 0
    for n, v in enumerate(co):
        _, i, d = tree.find(v)
        if d > reach:
            continue
        rv = np.linalg.norm(v - centre)
        rs = np.linalg.norm(pts[i] - centre)
        if rv < rs + clearance:
            out[n] = centre + (v - centre) * ((rs + clearance) / max(rv, 1e-6))
            pushed += 1
    print(f"  {pushed} of {len(co)} hair vertices were inside the skin")
    return out


# where a cap triangle is probed for skin poking through (barycentric): its
# middle, the middle of each edge, and a point near each corner
PROBES = np.array(
    [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8]]
)


def lift_cap(ctx, ob, clearance=0.003, rounds=30):
    """Lifts the scalp cap's vertices until its surface clears the skin.

    The cap is decimated with the cards, down to a few hundred big triangles,
    and a flat triangle spanning a curved skull cuts a chord through it: the
    skin shows through the middle of the triangle (orange and dark spots on
    the back and crown) though every vertex sits outside the head. Probes
    each cap triangle's surface and pushes its vertices radially out from the
    head's center by what the worst probe lacks, until none does."""
    me = ob.data
    me.calc_loop_triangles()
    tris = np.array([t.vertices[:] for t in me.loop_triangles if me.polygons[t.polygon_index].material_index == 1])
    if not len(tris):
        return
    head = {i for i in np.nonzero(ctx.HEADW > 0.5)[0]}
    faces = [tuple(int(i) for i in f) for f in ctx.FACES["body"] if all(i in head for i in f)]
    bvh = BVHTree.FromPolygons([tuple(p) for p in ctx.PB], faces)
    lo, hi = head_box(ctx)
    centre = (lo + hi) / 2
    co = np.array([v.co[:] for v in me.vertices])
    first = last = 0
    for rnd in range(rounds):
        push = np.zeros(len(co))
        for tri in tris:
            for p in PROBES @ co[tri]:
                hit = bvh.find_nearest(Vector(p), 0.05)
                if hit[0] is None:
                    continue
                gap = (Vector(p) - hit[0]).dot(hit[1])
                # at most 2 cm a round: a crease (ear, eye socket) can flip the sign
                need = min(clearance - gap, 0.02)
                if need > 0:
                    push[tri] = np.maximum(push[tri], need)
        last = int((push > 0).sum())
        first = first or last
        if not last:
            break
        out = co - centre
        co = co + out / np.linalg.norm(out, axis=1, keepdims=True) * push[:, None]
    me.vertices.foreach_set("co", co.ravel())
    me.update()
    print(f"  cap lift: {first} cap vertices touched skin, {last} after {rnd + 1} rounds")


def build_style(ctx, sid, pack, num, opts, mat_cache):
    parts = _load_pack(pack)[num]
    pieces = parts["hair"] + parts["scalp"]
    scalp = np.concatenate([p[0] for p in parts["scalp"]])
    img = next(p[3] for p in pieces if p[3] is not None)
    mask = None
    if opts.get("solid_scalp"):
        h, w = img.shape[:2]
        mask = scalp_mask(parts["scalp"], h, w)
    atlas = grey_atlas(img, f"hair_{sid}", mask)
    mat = proxies.textured(f"hair_{sid}", atlas, alpha=True)
    # the cap is its own material: the client gives strand cards their shine
    # but not the cap, whose big polygons would light up as silver facets
    cap_mat = proxies.textured(f"hair_{sid}_cap", atlas, alpha=True)
    # fully rough, unlike the cards: otherwise the two materials are identical
    # and optimize-doll.sh's dedup merges them, losing the cap's name
    cap_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
    verts, faces, uvs, base = [], [], [], 0
    for co, fs, uv, _ in pieces:
        verts.append(co)
        faces += [[i + base for i in f] for f in fs]
        uvs.append(uv)
        base += len(co)
    co = clear_of_skin(ctx, fit(ctx, np.concatenate(verts), scalp))
    ob = ctx.new_object(f"Hair_{sid}", co, faces)
    ob.data.materials.append(mat)
    ob.data.materials.append(cap_mat)
    # pieces are cards first, then the cap, and faces keep that order
    for poly in ob.data.polygons[sum(len(piece[1]) for piece in parts["hair"]) :]:
        poly.material_index = 1
    uv_layer = ob.data.uv_layers.new(name="UVMap")
    uv_layer.data.foreach_set("uv", np.concatenate(uvs).ravel())
    for p in ob.data.polygons:
        p.use_smooth = True
    # every style fits the triangle budget (download size, far fewer vertices to skin)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    ratio = opts.get("ratio") or min(1.0, TRI_BUDGET / tris)
    print(f"hair {sid}: {tris} tris, ratio {ratio:.2f}")
    if ratio < 1.0:
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
    lift_cap(ctx, ob)
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
