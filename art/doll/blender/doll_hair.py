"""Hair styles: MakeHuman CC0 hair proxies, plus space buns built here.

Each style is one object named Hair_<id> (ids match HAIR_STYLES in
src/game/look.ts). Textures become grey strand maps the client tints.
"""

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import proxies

# style id -> MakeHuman proxy
PROXY = {
    "waves": "hair/long01/long01.mhclo",
    "ponytail": "hair/ponytail01/ponytail01.mhclo",
    "bob": "hair/bob01/bob01.mhclo",
    "braids": "hair/braid01/braid01.mhclo",
    "afro": "hair/afro01/afro01.mhclo",
}
TEXTURE = {
    "waves": "hair/long01/long01_diffuse.png",
    "ponytail": "hair/ponytail01/ponytail01_diffuse.png",
    "bob": "hair/bob01/bob01_diffuse.png",
    "braids": "hair/braid01/braid01_diffuse.png",
    "afro": "hair/afro01/afro_diffuse.png",
}


def swing(ctx, ob, start):
    """Moves weight from the head to the pony bone for strands hanging
    behind and below `start` (Blender space), so tails sway."""
    pony = ob.vertex_groups["pony"]
    head = ob.vertex_groups["head"]
    for v in ob.data.vertices:
        behind = v.co.y - start[1]
        below = start[2] - v.co.z
        t = float(np.clip(min(behind / 0.05, 1) * np.clip(below / 0.08 + 0.5, 0, 1), 0, 1))
        if t > 0:
            pony.add([v.index], t, "REPLACE")
            head.add([v.index], 1 - t, "REPLACE")


def buns(ctx, mat):
    """A slicked-back scalp shell from MakeHuman's hair helper with two
    twisted buns on top."""
    # the scalp: head skin above the brow line and behind the hairline
    eye_z = ctx.JB["lEye"][2]
    head_i = ctx.BONES.index("head")
    faces = []
    for f in ctx.FACES["body"]:
        pts = ctx.PB[f]
        if ctx.W[f][:, head_i].min() < 0.98:
            continue
        front = pts[:, 1].mean() < ctx.JB["head"][1] - 0.035
        if pts[:, 2].min() > eye_z + (0.045 if front else -0.035):
            faces.append(f)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    verts = ctx.to_blender(ctx.P[used])
    ob = ctx.new_object("Hair_buns", verts, [[remap[i] for i in f] for f in faces])
    ob.data.update()
    nrm = np.array([v.normal[:] for v in ob.data.vertices])
    ob.data.vertices.foreach_set("co", (verts + nrm * 0.004).ravel())
    ob.data.materials.append(mat)
    src = np.array(used)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    head = Vector(ctx.JB["head"])
    top = max(v.co.z for v in bm.verts)
    added = []
    for side in (1, -1):
        c = Vector((side * 0.062, 0.01, top - 0.012))
        ret = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=0.045)
        for v in ret["verts"]:
            # a twist: ridges spiral around the bun
            d = v.co.normalized()
            ang = np.arctan2(d.y, d.x)
            v.co *= 1 + 0.06 * np.sin(ang * 5 + d.z * 6)
            v.co.z *= 0.86
            v.co += c
            added.append(v)
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True
    # bun verts ride the nearest scalp vertex
    co = np.array([v.co[:] for v in ob.data.vertices])
    base = co[: len(used)]
    near = np.array(
        [np.linalg.norm(base - p, axis=1).argmin() for p in co[len(used) :]], int
    )
    full_src = np.concatenate([src, src[near]])
    proxies.attach(
        ctx,
        ob,
        ctx.W[full_src],
        {k: d[full_src] for k, d in ctx.KEYS.items()},
    )
    return ob


def build(ctx):
    out = []
    for style, path in PROXY.items():
        img = proxies.detail_texture(TEXTURE[style], 1024)
        mat = proxies.textured(f"hair_{style}", img, alpha=True)
        ob = proxies.build(ctx, f"Hair_{style}", path, mat)
        if style in ("ponytail", "braids"):
            swing(ctx, ob, ctx.JB["head"] + np.array([0, 0.06, 0.02]))
        out.append(ob)
    solid = bpy.data.materials.new("hair_solid")
    out.append(buns(ctx, solid))
    return out
