"""Hair styles refitted from downloaded glTF hair (Sketchfab CC-BY, Quaternius
CC0; credits in docs/assets.md): models made for some other head, scaled and
placed onto ours.

For every style in STYLES this module

  * imports the model (DOWNLOADS/<folder>/extracted/scene.gltf, fetched by
    fetch_hair.sh) and keeps the meshes whose names match `keep` (all but the
    `head` ones by default),
  * fits it to our head: when the model comes with the head it was made on,
    that head's crown (the top 7 cm: width, depth and top) is mapped onto
    ours; otherwise the hair's own crown is, a little larger than our skull,
    so it sits like a wig. `scale`, `offset`, `turn` and `tilt` nudge the fit,
  * pushes any vertex that ended up inside the skin back out,
  * greys each texture so the client can tint it with look.hairColor (and
    floods the colour of opaque texels into the transparent ones, so no
    stray fringe rings the strand cards),
  * thins and decimates it to the near-model budget (optimize-doll.sh then
    makes the -lo twin from it),
  * rides every vertex on its nearest head-skin vertex for bones and shape
    keys, with a ponytail's tail on the pony bone so it swings.

Each style is one object named Hair_<id> (ids match HAIR_STYLES in
src/game/look.ts). `build(ctx, ids)` returns the objects.
"""

import math
import os

import bpy
import numpy as np
from mathutils import Euler, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import proxies

HERE = os.path.dirname(os.path.abspath(__file__))
# the downloads (git-ignored), one folder per model; fetch_hair.sh fills it
DOWNLOADS = os.environ.get("HAIR_DOWNLOADS", os.path.join(HERE, "..", "..", "..", "local-assets", "downloads"))

# Style id -> options:
#   src:    the download folder under DOWNLOADS (its extracted/scene.gltf)
#   head:   name fragment of the model's own head mesh, to fit by (and drop)
#   keep:   name fragments of the meshes to keep (default: every other mesh)
#   cap:    name fragments of scalp-cap meshes: a matte, opaque material
#   scale:  multiplies the fitted size; offset: metres (x right, y back, z up)
#   turn:   degrees about the vertical before fitting (a model facing +y: 180)
#   tilt:   degrees about the left-right axis (positive tips the crown back)
#   tris:   near-model triangle budget (default TRI_BUDGET)
#   thin:   share of strand cards (loose mesh islands) to drop before decimating
#   swing:  offset from the head joint where a tail starts to sway (pony bone)
#   grow:   for a model without a head, how much wider than our crown the
#           hair's own crown is (its thickness)
STYLES: dict[str, dict] = {
    # trial fits, renamed to style ids once they look right
    "try-twintail": {"src": "hair-sketchfab-summer66-twintail-19984", "head": "retopo", "keep": ["hair_l", "hair_tail"]},
    "try-pocolov13": {"src": "hair-sketchfab-pocolov-pocolov-hair-13-325ae", "head": "Head_", "cap": ["Hair_Base"]},
    "try-pocolov05": {"src": "hair-sketchfab-pocolov-pocolov-hair-05-a86b6", "head": "Head_", "cap": ["Hair_Base"]},
    "try-pocolov09": {"src": "hair-sketchfab-pocolov-pocolov-hair-09-51535", "head": "Head_", "cap": ["Hair_Base"]},
    "try-pocolov11": {"src": "hair-sketchfab-pocolov-pocolov-hair-11-1f848", "head": "Head_", "cap": ["Hair_Base"]},
    "try-pocolov16": {"src": "hair-sketchfab-pocolov-pocolov-hair-16-9d4f1", "head": "Head_", "cap": ["Hair_Base"]},
    "try-pocolov17": {"src": "hair-sketchfab-pocolov-pocolov-hair-17-605ea", "head": "Head_", "cap": ["Hair_Base"]},
    "try-alexpony": {"src": "hair-sketchfab-alexm777-female-hair-ponytail-bb4d9", "head": "Head_"},
    "try-turban": {"src": "hair-sketchfab-harsh4756-sikh-turban-30cdd", "grow": 1.18},
    "try-afro": {"src": "hair-sketchfab-continuumreed-hair-afro-style-rose-character-4b2ab", "keep": ["Object"]},
    "try-bantu": {"src": "hair-sketchfab-marvibun-bantu-knot-hairstyle-game-read-cb069", "grow": 1.1},
    "try-cliffbun": {"src": "hair-sketchfab-cliffunderside-messy-low-bun-female-hairstyle-db7a6", "head": "M_Head", "keep": ["Hair"]},
    "try-greedybuns": {"src": "hair-sketchfab-greedyengine-hair-double-buns-f77fc", "head": "Mesh_Mannequin", "keep": ["Hair"]},
    "try-pixie": {"src": "hair-sketchfab-dlm96-stylised-pixie-haircut-24737"},
    "try-digibob": {"src": "hair-sketchfab-digitalwitch-bobhair-2149a"},
    "try-hijab": {"src": "hair-sketchfab-witmerad-hijab-1-6e176", "grow": 1.25},
}

TRI_BUDGET = int(os.environ.get("HAIR_TRIS", "8000"))
ALPHA_LEVELS = 15
# the band of the crown that fits a model to our head, metres from the top
CROWN = 0.07


def head_points(ctx, weight=0.98):
    """Our head's skin vertices (Blender space), the head bone's alone."""
    head = np.unique(np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > weight]))
    return ctx.PB[head]


def crown(pts, depth):
    """Center (x, y), half-width, half-depth and top of the points within
    `depth` of the highest one: the dome of a skull, or of a head of hair."""
    top = pts[:, 2].max()
    band = pts[pts[:, 2] > top - depth]
    lo, hi = band.min(axis=0), band.max(axis=0)
    return (lo + hi) / 2, (hi - lo) / 2, top


def head_box(ctx):
    """Min and max corners of our head from the brow up (Blender space)."""
    pts = head_points(ctx)
    pts = pts[pts[:, 2] > ctx.JB["lEye"][2] - 0.02]
    return pts.min(axis=0), pts.max(axis=0)


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


def clear_of_skin(ctx, co, clearance=0.002, reach=0.03):
    """Pushes hair vertices that ended up inside the head back out. A cap cut
    for another skull sinks into ours here and there, and the skin shows
    through as bald patches. Each vertex within `reach` of the head's skin
    keeps at least `clearance` meters of radial distance from the head's
    center above the nearest skin vertex."""
    lo, hi = head_box(ctx)
    centre = (lo + hi) / 2
    pts = head_points(ctx, 0.5)
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


def clear_of_body(ctx, co, clearance=0.004):
    """Moves hair that hangs inside the neck, shoulders or back out to just
    above the skin, along the skin's normal: long hair cut for a slimmer
    body would otherwise poke through it."""
    body = [tuple(int(i) for i in f) for f in ctx.FACES["body"]]
    bvh = BVHTree.FromPolygons([tuple(p) for p in ctx.PB], body)
    eye_z = ctx.JB["lEye"][2]
    out = co.copy()
    moved = 0
    for n, v in enumerate(co):
        # the head is clear_of_skin's: its radial push keeps a cap's shape
        if v[2] > eye_z:
            continue
        hit = bvh.find_nearest(Vector(v), 0.05)
        if hit[0] is None:
            continue
        gap = (Vector(v) - hit[0]).dot(hit[1])
        if gap < clearance:
            out[n] = np.array(hit[0] + hit[1] * clearance)
            moved += 1
    print(f"  {moved} hair vertices were inside the body")
    return out


# where a cap triangle is probed for skin poking through (barycentric): its
# middle, the middle of each edge, and a point near each corner
PROBES = np.array(
    [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8]]
)


def lift_cap(ctx, ob, clearance=0.003, rounds=30, index=1):
    """Lifts the scalp cap's vertices until its surface clears the skin.

    A decimated cap is a few hundred big triangles, and a flat triangle
    spanning a curved skull cuts a chord through it: the skin shows through
    the middle of the triangle though every vertex sits outside the head.
    Probes each triangle of material `index` and pushes its vertices
    radially out from the head's center by what the worst probe lacks,
    until none does."""
    me = ob.data
    me.calc_loop_triangles()
    tris = np.array(
        [t.vertices[:] for t in me.loop_triangles if me.polygons[t.polygon_index].material_index == index]
    )
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


def _image_of(material):
    """The base-colour image of an imported glTF material, if it has one."""
    if not material or not material.node_tree:
        return None
    for n in material.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            return n.image
    return None


def _pixels(img, size=1024):
    """An image's RGBA texels, top row last, shrunk to at most `size` square
    (the client loads hair at 1024 px, and greying a 4K atlas takes minutes)."""
    if max(img.size) > size:
        w, h = img.size
        img.scale(max(1, w * size // max(w, h)), max(1, h * size // max(w, h)))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)


def _matches(name, fragments):
    low = name.lower()
    return any(f.lower() in low for f in fragments)


def load(src, opts):
    """The model's kept meshes as world-space pieces, and its head's points.

    Each piece is (verts, faces, per-loop uvs or None, image or None, is_cap);
    the import is removed again afterwards."""
    path = os.path.join(DOWNLOADS, src, opts.get("file", os.path.join("extracted", "scene.gltf")))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    added = [o for o in bpy.data.objects if o not in before]
    rot = Euler((math.radians(opts.get("tilt", 0.0)), 0, math.radians(opts.get("turn", 0.0)))).to_matrix()
    head_frag = opts.get("head")
    keep = opts.get("keep")
    pieces, head = [], []
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in added:
        if ob.type != "MESH":
            continue
        me = ob.data
        mw = ob.matrix_world
        # a skinned model's vertices where its armature holds them
        posed = ob.evaluated_get(deps).to_mesh()
        co = np.array([(rot @ (mw @ v.co))[:] for v in posed.vertices])
        ob.evaluated_get(deps).to_mesh_clear()
        if head_frag and _matches(ob.name, [head_frag]):
            head.append(co)
            continue
        if keep is not None and not _matches(ob.name, keep):
            continue
        uvs = np.array([lp.uv[:] for lp in me.uv_layers.active.data]) if me.uv_layers.active else None
        # one piece per material, so a mesh's cards and cap stay apart
        for mi, mat in enumerate(me.materials or [None]):
            polys = [p for p in me.polygons if p.material_index == mi]
            if not polys:
                continue
            faces = [list(p.vertices) for p in polys]
            loops = None if uvs is None else np.concatenate([uvs[p.loop_start : p.loop_start + p.loop_total] for p in polys])
            img = _image_of(mat)
            cap = _matches(ob.name, opts.get("cap", ())) or (mat is not None and _matches(mat.name, opts.get("cap", ())))
            pieces.append((co, faces, loops, img, cap))
    images = {id(p[3]): _pixels(p[3]) for p in pieces if p[3] is not None}
    pieces = [(co, f, uv, None if img is None else images[id(img)], cap) for co, f, uv, img, cap in pieces]
    for ob in added:
        bpy.data.objects.remove(ob)
    return pieces, (np.concatenate(head) if head else None)


def fit(ctx, co, ref, opts):
    """Maps the crown of `ref` (the model's head, or the hair itself) onto
    our crown: the same width, depth and top, the same middle, one scale."""
    ours = head_points(ctx)
    c0, h0, top0 = crown(ours, CROWN)
    # a first guess from overall width sets how deep a band to compare
    k = np.ptp(ours[:, 0]) / max(np.ptp(ref[:, 0]), 1e-9)
    c1, h1, top1 = crown(ref, CROWN / k)
    grow = 1.0 if opts.get("head") else opts.get("grow", 1.12)
    k = float(np.mean(h0[:2] / h1[:2])) * grow * opts.get("scale", 1.0)
    out = (co - np.array([c1[0], c1[1], top1])) * k + np.array([c0[0], c0[1], top0])
    if not opts.get("head"):
        # the hair's own crown sits its thickness above the skull's
        out[:, 2] += (grow - 1) * h0[0]
    return out + np.array(opts.get("offset", (0.0, 0.0, 0.0)))


def thin(faces, keep_share, seed):
    """Drops a share of the loose islands (strand cards), evenly at random,
    so a dense card head keeps its outline on fewer triangles."""
    parent = {}

    def root(i):
        while parent.setdefault(i, i) != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for f in faces:
        for i in f[1:]:
            parent[root(i)] = root(f[0])
    rng = np.random.default_rng(seed)
    islands = sorted({root(f[0]) for f in faces})
    kept = {i for i in islands if rng.random() < keep_share}
    return [n for n, f in enumerate(faces) if root(f[0]) in kept]


def build_style(ctx, sid, opts):
    pieces, head = load(opts["src"], opts)
    hair = np.concatenate([p[0] for p in pieces])
    co_all = fit(ctx, hair, head if head is not None else hair, opts)
    materials, mat_of = [], {}
    verts, faces, uvs, mat_idx, base = [], [], [], [], 0
    offset = 0
    for n, (co, fs, uv, px, cap) in enumerate(pieces):
        count = len(co)
        fitted = co_all[offset : offset + count]
        offset += count
        key = (id(px) if px is not None else None, cap)
        if key not in mat_of:
            mname = f"hair_{sid}_cap" if cap else f"hair_{sid}" + (f"_{len(materials)}" if materials else "")
            if px is not None:
                img = grey_atlas(px, mname)
                m = proxies.textured(mname, img, alpha=not cap)
            else:
                m = bpy.data.materials.new(mname)
            if cap:
                # fully rough: optimize-doll.sh's dedup would otherwise merge
                # it with the cards' and lose the cap's name
                m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
            mat_of[key] = len(materials)
            materials.append(m)
        if opts.get("thin") and not cap:
            idx = thin(fs, 1 - opts["thin"], n)
            loop_starts = np.cumsum([0] + [len(f) for f in fs])
            if uv is not None:
                uv = np.concatenate([uv[loop_starts[i] : loop_starts[i + 1]] for i in idx])
            fs = [fs[i] for i in idx]
        verts.append(fitted)
        faces += [[i + base for i in f] for f in fs]
        mat_idx += [mat_of[key]] * len(fs)
        uvs.append(uv if uv is not None else np.zeros((sum(len(f) for f in fs), 2)))
        base += count
    co = np.concatenate(verts)
    co = clear_of_body(ctx, clear_of_skin(ctx, co))
    ob = ctx.new_object(f"Hair_{sid}", co, faces)
    for m in materials:
        ob.data.materials.append(m)
    ob.data.polygons.foreach_set("material_index", np.array(mat_idx, np.int32))
    uv_layer = ob.data.uv_layers.new(name="UVMap")
    uv_layer.data.foreach_set("uv", np.concatenate(uvs).ravel())
    for p in ob.data.polygons:
        p.use_smooth = True
    # unused vertices (thinned cards) go
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    ratio = min(1.0, opts.get("tris", TRI_BUDGET) / tris)
    print(f"hair {sid}: {tris} tris, ratio {ratio:.2f}")
    if ratio < 1.0:
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
    caps = [i for i, m in enumerate(materials) if m.name.endswith("_cap")]
    if caps:
        lift_cap(ctx, ob, index=caps[0])
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


def build(ctx, ids=None):
    return [build_style(ctx, sid, opts) for sid, opts in STYLES.items() if ids is None or sid in ids]
