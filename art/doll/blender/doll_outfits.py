"""Outfits, swimsuits and shoes, each one object the client shows or hides.

Names: Outfit_<id> (OUTFITS in src/game/look.ts), Swim_<id> (SWIMSUITS) and
Shoes_<id>. Garments come from MakeHuman CC0 proxies or are cut from the base
mesh's tights and skirt helpers, so all of them follow the body sliders. Each
garment also adds a "tuck_<name>" shape key to the body that pulls the skin
under it inwards, so skin never pokes through cloth.
"""

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import proxies

TUCK = 0.006  # metres the skin under a garment sinks
CLEAR = 0.004  # gap kept between sunk skin and the cloth


def heights(ctx):
    J = ctx.JB
    return {
        "knee": J["lShin"][2],
        "ankle": J["lFoot"][2],
        "hip": J["lLeg"][2],
        "shoulder": J["lArm"][2],
        "neck": J["head"][2],
    }


def flare(ctx, ob):
    """Bell-bottoms: below the knee, push leg cloth away from the leg's own
    axis, more towards the hem."""
    h = heights(ctx)
    for v in ob.data.vertices:
        z = v.co.z
        if z > h["knee"] or abs(v.co.x) < 0.01:
            continue
        side = "lShin" if v.co.x > 0 else "rShin"
        axis_x = ctx.JB[side][0] * 0.85
        t = (h["knee"] - z) / (h["knee"] - h["ankle"] + 1e-6)
        grow = 1 + 0.9 * min(t, 1.15) ** 1.6
        v.co.x = axis_x + (v.co.x - axis_x) * grow
        v.co.y = v.co.y * grow
    sync_keys(ob, np.array([v.co[:] for v in ob.data.vertices]))


def shell(ctx, name, groups, bands, push, mat, arms=0.3):
    """Cuts base-mesh helper shells (tights, skirt) to horizontal bands
    [(z_lo, z_hi), ...], clamps cut edges flat onto the band lines so hems
    are straight, and pushes the cloth out along its normals by `push`
    metres. Faces mostly on the arms (bone weight > `arms`) are dropped."""
    faces = []
    for g in groups:
        for f in ctx.FACES[g]:
            z = ctx.PB[f][:, 2]
            if arm_weight(ctx, f) > arms:
                continue
            if any(z.max() > lo and z.min() < hi for lo, hi in bands):
                faces.append(f)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    co = ctx.PB[used].copy()
    for i, z in enumerate(co[:, 2]):
        # snap each vertex into the nearest band
        lo, hi = min(bands, key=lambda b: max(b[0] - z, z - b[1], 0))
        co[i, 2] = min(max(z, lo), hi)
    ob = ctx.new_object(name, co, [[remap[i] for i in f] for f in faces])
    ob.data.materials.append(mat)
    me = ob.data
    me.update()
    normals = np.array([v.normal[:] for v in me.vertices])
    me.vertices.foreach_set("co", (co + normals * push).ravel())
    for p in me.polygons:
        p.use_smooth = True
    src = np.array(used)
    proxies.attach(ctx, ob, ctx.W[src], {k: d[src] for k, d in ctx.KEYS.items()})
    return ob


def taper(ob, top, bottom, squeeze):
    """Takes a skirt in towards its hem: radial scale 1 at `top`, 1 -
    `squeeze` at `bottom`, about the skirt's own vertical axis."""
    co = np.array([v.co[:] for v in ob.data.vertices])
    cy = co[:, 1].mean()
    t = np.clip((top - co[:, 2]) / (top - bottom), 0, 1)
    k = 1 - squeeze * t
    co[:, 0] *= k
    co[:, 1] = cy + (co[:, 1] - cy) * k
    ob.data.vertices.foreach_set("co", co.ravel())
    sync_keys(ob, co)


def sync_keys(ob, basis):
    """After moving a mesh's basis, moves every shape key by the same."""
    keys = ob.data.shape_keys.key_blocks
    old = np.empty(len(basis) * 3)
    keys["Basis"].data.foreach_get("co", old)
    old = old.reshape(-1, 3)
    for k in keys:
        c = np.empty(len(basis) * 3)
        k.data.foreach_get("co", c)
        k.data.foreach_set("co", (c.reshape(-1, 3) - old + basis).ravel())


def arm_weight(ctx, f):
    i = [ctx.BONES.index(b) for b in ("lArm", "rArm", "lFore", "rFore")]
    return ctx.W[f][:, i].sum(axis=1).max()


def tuck(ctx, body, body_src, garment, name):
    """A body shape key sinking the skin a garment covers: each covered
    vertex sinks just far enough to sit CLEAR behind the cloth surface."""
    co = np.array([v.co[:] for v in body.data.vertices])
    normals = np.array([v.normal[:] for v in body.data.vertices])
    sink = np.zeros(len(co))
    if "deleted" in garment:
        sink[np.isin(body_src, np.array(garment["deleted"], int))] = TUCK
    bvh = BVHTree.FromObject(garment, bpy.context.evaluated_depsgraph_get())
    for i, p in enumerate(co):
        loc, _n, _f, dist = bvh.find_nearest(Vector(p), 0.03)
        if loc is None:
            continue
        outside = float(np.dot(p - np.array(loc), normals[i]))
        if outside > -CLEAR:
            sink[i] = max(sink[i], min(outside + CLEAR, 0.03))
    sk = body.shape_key_add(name=f"tuck_{name}", from_mix=False)
    sk.data.foreach_set("co", (co - normals * sink[:, None]).ravel())


def build(ctx, body, body_src):
    h = heights(ctx)
    out = []
    cloth = bpy.data.materials.new("cloth")
    satin = bpy.data.materials.new("satin")
    fur = bpy.data.materials.new("fur")

    # crop top and flares, from the CC0 sports suit
    img = proxies.detail_texture(
        "clothes/female_sportsuit01/female_sportsuit01_diffuse.png", 1024
    )
    flares = proxies.build(
        ctx,
        "Outfit_flares",
        "clothes/female_sportsuit01/female_sportsuit01.mhclo",
        proxies.textured("outfit_flares", img),
    )
    flare(ctx, flares)
    out.append(flares)

    # slip mini: a strapless satin bodice on the tights helper, a fitted skirt
    # from the skirt helper ending mid-thigh
    bust = h["shoulder"] - 0.1
    waist = h["hip"] + 0.1
    hem = h["hip"] - 0.2
    top = shell(ctx, "Outfit_mini", ["helper-tights"], [(waist - 0.04, bust)], 0.002, satin)
    sk = shell(ctx, "mini_skirt", ["helper-skirt"], [(hem, waist)], 0.003, satin)
    taper(sk, waist, hem, 0.16)
    out.append(join(top, sk))

    # faux fur: a cropped jacket with sleeves to the wrist, over a skirt
    coat = shell(
        ctx, "Outfit_fur", ["helper-tights"], [(waist + 0.02, h["neck"] - 0.04)], 0.022, fur, arms=1.1
    )
    sk2 = shell(ctx, "fur_skirt", ["helper-skirt"], [(hem, waist)], 0.003, satin)
    taper(sk2, waist, hem, 0.16)
    out.append(join(coat, sk2))

    # swimsuits
    out.append(
        shell(ctx, "Swim_one-piece", ["helper-tights"], [(h["hip"] - 0.08, bust + 0.015)], 0.0015, cloth, arms=0.2)
    )
    out.append(
        shell(
            ctx,
            "Swim_bikini",
            ["helper-tights"],
            [(bust - 0.1, bust + 0.01), (h["hip"] - 0.08, h["hip"] + 0.03)],
            0.0015,
            cloth,
            arms=0.2,
        )
    )

    # shoes: CC0 sneakers keep their own colours
    shoe_img = proxies.detail_texture(
        "clothes/shoes06/shoes06_diffuse.png", 512, keep_colour=True
    )
    out.append(
        proxies.build(
            ctx,
            "Shoes_sneakers",
            "clothes/shoes06/shoes06.mhclo",
            proxies.textured("shoes_sneakers", shoe_img),
        )
    )
    for ob in out:
        tuck(ctx, body, body_src, ob, ob.name.split("_", 1)[1])
    return out


def join(a, b):
    bpy.ops.object.select_all(action="DESELECT")
    a.select_set(True)
    b.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    return a
