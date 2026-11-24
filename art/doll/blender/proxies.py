"""Fits MakeHuman CC0 proxies (.mhclo hair and clothes) to the doll.

A proxy vertex is three base-mesh vertices mixed by barycentric weights, plus
an offset scaled by the body's own size. Fitting it to the shaped, re-posed
base mesh, and mixing the same three vertices' bone weights and shape-key
deltas, makes hair and clothes follow every body slider and pose for free.
"""

import os

import bpy
import numpy as np
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, ".cache", "mhassets")


def read_mhclo(path):
    refs, weights, offsets, scales, deleted = [], [], [], {}, set()
    obj_file = None
    mode = None
    with open(path) as f:
        for line in f:
            p = line.split()
            if not p or p[0].startswith("#"):
                continue
            if p[0] in ("x_scale", "y_scale", "z_scale"):
                scales[p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
            elif p[0] == "obj_file":
                obj_file = p[1]
            elif p[0] == "verts":
                mode = "verts"
            elif p[0] == "delete_verts":
                mode = "delete"
            elif mode == "verts" and p[0][0].isdigit():
                if len(p) == 1:
                    refs.append([int(p[0])] * 3)
                    weights.append([1.0, 0.0, 0.0])
                    offsets.append([0.0, 0.0, 0.0])
                else:
                    refs.append([int(x) for x in p[:3]])
                    weights.append([float(x) for x in p[3:6]])
                    offsets.append([float(x) for x in p[6:9]])
            elif mode == "delete" and p[0][0].isdigit():
                # ranges are written "a - b"
                i = 0
                while i < len(p):
                    if i + 2 < len(p) and p[i + 1] == "-":
                        deleted.update(range(int(p[i]), int(p[i + 2]) + 1))
                        i += 3
                    else:
                        deleted.add(int(p[i]))
                        i += 1
    return {
        "dir": os.path.dirname(path),
        "obj": obj_file,
        "refs": np.array(refs, dtype=int),
        "w": np.array(weights),
        "d": np.array(offsets),
        "scales": scales,
        "deleted": deleted,
    }


def read_obj(path):
    """UVs and faces (vertex and uv indices) of a proxy's own mesh."""
    uvs, faces = [], []
    with open(path) as f:
        for line in f:
            p = line.split()
            if not p:
                continue
            if p[0] == "vt":
                uvs.append((float(p[1]), float(p[2])))
            elif p[0] == "f":
                vs, ts = [], []
                for c in p[1:]:
                    q = c.split("/")
                    vs.append(int(q[0]) - 1)
                    ts.append(int(q[1]) - 1 if len(q) > 1 and q[1] else 0)
                faces.append((vs, ts))
    return uvs, faces


def fit(clo, P):
    """Proxy vertex positions on base mesh P (MakeHuman space)."""
    s = clo["scales"]
    # a proxy without an axis's scale line keeps its offsets as authored
    scale = np.array(
        [abs(P[s[a][0]][i] - P[s[a][1]][i]) / s[a][2] if a in s else 1.0 for i, a in enumerate("xyz")]
    )
    return np.einsum("nk,nkd->nd", clo["w"], P[clo["refs"]]) + clo["d"] * scale


def mix(clo, per_vertex):
    """Mixes a per-base-vertex array (weights, key deltas) onto the proxy."""
    return np.einsum("nk,nk...->n...", clo["w"], per_vertex[clo["refs"]])


def snug_weights(ctx, verts, weights, reach, reference=None):
    """Bone weights that make cloth follow the skin under it.

    A proxy's own weights blend three base vertices' weights, so in a pose
    the cloth slides a centimeter or two off the skin it covers (a jacket
    chest buckles over the pecs and the skin shows through). Within `reach`
    metres of the skin a vertex takes the weights of the skin around its
    nearest point (inverse distance over three vertices), fading back to its
    own weights by `reach`, so loose hems and skirts keep theirs."""
    skin = np.array(sorted({i for f in ctx.FACES["body"] for i in f}))
    tree = KDTree(len(skin))
    points = ctx.PB if reference is None else reference
    for i, p in enumerate(points[skin]):
        tree.insert(p, i)
    tree.balance()
    out = weights.copy()
    for vi, p in enumerate(verts):
        near = tree.find_n(p, 3)
        d = near[0][2]
        if d >= reach:
            continue
        inv = np.array([1 / max(n[2], 1e-4) for n in near])
        skin_w = (inv[:, None] * ctx.W[skin[[n[1] for n in near]]]).sum(0) / inv.sum()
        # all of the skin's weights within a third of the reach, none at it
        t = min(1.0, (reach - d) / (reach * 2 / 3))
        out[vi] = t * skin_w + (1 - t) * weights[vi]
    return out


def build(ctx, name, rel_path, mat, snug=0.0, ratio=1.0, fit_delta=None, skin=None):
    """One proxy as a skinned, shape-keyed Blender object.

    ctx carries the doll's P, W, BONES, KEYS (MakeHuman space) and its
    to_blender and new_object helpers. `snug` (metres) makes cloth within
    that reach of the skin follow it (snug_weights); 0 keeps the proxy's own.
    `ratio` < 1 decimates a proxy denser than it needs to be.
    `fit_delta` is a MakeHuman pose target for proxies authored on bent feet.
    `skin` projects close-fitting transparent cloth just over the skin.
    """
    clo = read_mhclo(os.path.join(ASSETS, rel_path))
    uvs, faces = read_obj(os.path.join(clo["dir"], clo["obj"]))
    base = ctx.P if fit_delta is None else ctx.P + fit_delta
    verts = ctx.to_blender(fit(clo, base))
    if skin is not None:
        for i, vert in enumerate(verts):
            point, normal, _face, _distance = skin.find_nearest(vert)
            verts[i] = point + normal * 0.006
    ob = ctx.new_object(name, verts, [f[0] for f in faces])
    ob.data.materials.append(mat)
    uv = ob.data.uv_layers.new(name="UVMap").data
    li = 0
    for vs, ts in faces:
        for t in ts:
            uv[li].uv = uvs[t] if uvs else (0, 0)
            li += 1
    for p in ob.data.polygons:
        p.use_smooth = True
    weights = mix(clo, ctx.W)
    if snug:
        reference = None if fit_delta is None else ctx.to_blender(base)
        weights = snug_weights(ctx, verts, weights, snug, reference)
    keys = {k: mix(clo, d) * (1.25 if k == "plus" else 1) for k, d in ctx.KEYS.items()}
    if ratio < 1.0:
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
        # each kept vertex takes the weights and key deltas of the fitted
        # vertex it sits on (or nearest)
        tree = KDTree(len(verts))
        for i, v in enumerate(verts):
            tree.insert(v, i)
        tree.balance()
        near = [tree.find(v.co)[1] for v in ob.data.vertices]
        weights = weights[near]
        keys = {k: d[near] for k, d in keys.items()}
    attach(ctx, ob, weights, keys)
    ob["deleted"] = sorted(clo["deleted"])
    return ob


def attach(ctx, ob, weights, keys):
    """Bone weights and the doll's shape keys for a mesh built in Blender
    space; `keys` holds MakeHuman-space deltas per vertex."""
    weights = weights / np.maximum(weights.sum(axis=1, keepdims=True), 1e-9)
    for b in ctx.BONES:
        ob.vertex_groups.new(name=b)
    for vi, row in enumerate(weights):
        for bi, w in enumerate(row):
            if w > 0.002:
                ob.vertex_groups[bi].add([vi], float(w), "REPLACE")
    ob.shape_key_add(name="Basis")
    base = np.array([v.co[:] for v in ob.data.vertices])
    for k, d in keys.items():
        sk = ob.shape_key_add(name=k, from_mix=False)
        sk.slider_min = -1
        sk.value = 0
        sk.data.foreach_set("co", (base + ctx.to_blender(d, offset=False)).ravel())


def detail_texture(rel_path, size=1024, keep_colour=False, blank=(), contrast=None):
    """Loads a proxy texture, shrinks it and (unless keep_colour) turns it
    into a light grey detail map the client tints with the chosen colour.
    `blank`: (u, v, radius) circles, v from the image's top, painted over
    with the ring of colour around them (a printed logo, say).
    `contrast`: the most the grey may spread (standard deviation of its log),
    so a near-black or two-tone texture doesn't tint into patches."""
    img = bpy.data.images.load(os.path.join(ASSETS, rel_path))
    if img.size[0] > size:
        img.scale(size, size)
    if blank:
        w, h = img.size
        px = np.empty(w * h * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(h, w, 4)
        yy, xx = np.mgrid[0:h, 0:w]
        for u, v, r in blank:
            # Blender rows run bottom to top
            d = np.hypot((xx - u * w) / w, (yy - (1 - v) * h) / h)
            ring = (d > r) & (d < r * 1.25)
            px[d <= r, :3] = np.median(px[ring, :3], axis=0)
        img.pixels.foreach_set(px.ravel())
    if not keep_colour:
        px = np.empty(img.size[0] * img.size[1] * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(-1, 4)
        lum = px[:, :3] @ np.array([0.3, 0.59, 0.11], np.float32)
        solid = px[:, 3] > 0.5
        mean = lum[solid].mean() if solid.any() else lum.mean()
        # centre the shading on 0.85 so the tint reads at its true colour
        g = np.clip(lum * (0.85 / max(mean, 1e-3)), 0, 1)
        if contrast is not None:
            # in log space, about the (geometric) mean: shading stays relative
            log = np.log(np.maximum(lum, 1e-3))
            centre = log[solid].mean() if solid.any() else log.mean()
            spread = log[solid].std() if solid.any() else log.std()
            k = min(1.0, contrast / max(spread, 1e-6))
            g = np.clip(0.85 * np.exp(k * (log - centre)), 0, 1)
        px[:, 0] = px[:, 1] = px[:, 2] = g
        img.pixels.foreach_set(px.ravel())
    img.pack()
    return img


def textured(name, img, alpha=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha:
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    return m
