"""Fits MakeHuman CC0 proxies (.mhclo hair and clothes) to the doll.

A proxy vertex is three base-mesh vertices mixed by barycentric weights, plus
an offset scaled by the body's own size. Fitting it to the shaped, re-posed
base mesh, and mixing the same three vertices' bone weights and shape-key
deltas, makes hair and clothes follow every body slider and pose for free.
"""

import os

import bpy
import numpy as np

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
    scale = np.array(
        [abs(P[s[a][0]][i] - P[s[a][1]][i]) / s[a][2] for i, a in enumerate("xyz")]
    )
    return np.einsum("nk,nkd->nd", clo["w"], P[clo["refs"]]) + clo["d"] * scale


def mix(clo, per_vertex):
    """Mixes a per-base-vertex array (weights, key deltas) onto the proxy."""
    return np.einsum("nk,nk...->n...", clo["w"], per_vertex[clo["refs"]])


def build(ctx, name, rel_path, mat):
    """One proxy as a skinned, shape-keyed Blender object.

    ctx carries the doll's P, W, BONES, KEYS (MakeHuman space) and its
    to_blender and new_object helpers.
    """
    clo = read_mhclo(os.path.join(ASSETS, rel_path))
    uvs, faces = read_obj(os.path.join(clo["dir"], clo["obj"]))
    verts = ctx.to_blender(fit(clo, ctx.P))
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
    attach(ctx, ob, mix(clo, ctx.W), {k: mix(clo, d) for k, d in ctx.KEYS.items()})
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
        sk.data.foreach_set("co", (base + ctx.to_blender(d, offset=False)).ravel())


def detail_texture(rel_path, size=1024, keep_colour=False):
    """Loads a proxy texture, shrinks it and (unless keep_colour) turns it
    into a light grey detail map the client tints with the chosen colour."""
    img = bpy.data.images.load(os.path.join(ASSETS, rel_path))
    if img.size[0] > size:
        img.scale(size, size)
    if not keep_colour:
        px = np.empty(img.size[0] * img.size[1] * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(-1, 4)
        lum = px[:, :3] @ np.array([0.3, 0.59, 0.11], np.float32)
        solid = px[:, 3] > 0.5
        mean = lum[solid].mean() if solid.any() else lum.mean()
        # centre the shading on 0.85 so the tint reads at its true colour
        g = np.clip(lum * (0.85 / max(mean, 1e-3)), 0, 1)
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
