"""Outfits, swimsuits and shoes, each one object the client shows or hides.

Names: Outfit_<id> (OUTFITS in src/game/look.ts), Swim_<id> (SWIMSUITS) and
Shoes_<id>. Garments come from MakeHuman CC0 proxies or are cut from the base
mesh's tights and skirt helpers, so all of them follow the body sliders. Each
garment also adds a "tuck_<name>" shape key to the body that pulls the skin
under it inwards, so skin never pokes through cloth.
"""

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

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
    metres. Faces mostly on the arms (bone weight > `arms`) are dropped.
    A band's lower edge may be a function of (x, y) instead of a height, for
    a curved hem such as a bikini's leg line."""

    def edge(lo, p):
        return lo(p[0], p[1]) if callable(lo) else lo

    def overlaps(f, lo, hi):
        pts = ctx.PB[f]
        return pts[:, 2].min() < hi and any(p[2] > edge(lo, p) for p in pts)

    faces = []
    for g in groups:
        for f in ctx.FACES[g]:
            if arm_weight(ctx, f) > arms:
                continue
            if any(overlaps(f, lo, hi) for lo, hi in bands):
                faces.append(f)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    co = ctx.PB[used].copy()
    for i, p in enumerate(co):
        # snap each vertex into the nearest band
        z = p[2]
        lo, hi = min(bands, key=lambda b: max(edge(b[0], p) - z, z - b[1], 0))
        co[i, 2] = min(max(z, edge(lo, p)), hi)
    # a vertex moved onto a hem may float off a curved body (a hip): put it
    # back on the shell's surface
    moved = np.abs(co[:, 2] - ctx.PB[used][:, 2]) > 1e-6
    if moved.any():
        bvh = BVHTree.FromPolygons(
            [tuple(p) for p in ctx.PB[used]], [[remap[i] for i in f] for f in faces]
        )
        for i in np.nonzero(moved)[0]:
            hit = bvh.find_nearest(Vector(co[i]))[0]
            if hit is not None:
                co[i] = (hit.x, hit.y, co[i, 2])
    ob = ctx.new_object(name, co, [[remap[i] for i in f] for f in faces])
    ob.data.materials.append(mat)
    me = ob.data
    me.update()
    normals = np.array([v.normal[:] for v in me.vertices])
    me.vertices.foreach_set("co", (co + normals * push).ravel())
    for p in me.polygons:
        p.use_smooth = True
    src = np.array(used)
    # the helper shells follow some targets less than the skin does (bust),
    # so each key moves the cloth like the nearest skin vertex, a touch more
    skin = np.array(sorted({i for f in ctx.FACES["body"] for i in f}))
    tree = KDTree(len(skin))
    for i, p in enumerate(ctx.PB[skin]):
        tree.insert(p, i)
    tree.balance()
    near = skin[[tree.find(ctx.PB[i])[1] for i in src]]
    proxies.attach(
        ctx, ob, ctx.W[src], {k: d[near] * 1.05 for k, d in ctx.KEYS.items()}
    )
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


def stretch(ob, top, hem, to):
    """Lengthens a skirt: below `top`, heights scale so the hem at `hem`
    falls to `to` instead (a midi or maxi from the short skirt helper)."""
    co = np.array([v.co[:] for v in ob.data.vertices])
    below = co[:, 2] < top
    k = (top - to) / (top - hem)
    co[below, 2] = top - (top - co[below, 2]) * k
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

    # everyday wear from the CC0 MakeHuman suits: tee and skinny jeans, tee
    # and denim shorts, a striped blouse and pencil skirt. The tees' printed
    # logo is painted out.
    logo = ((0.79, 0.27, 0.105),)
    for cut, suit, blank in (
        ("jeans", "female_casualsuit01", logo),
        ("shorts", "female_casualsuit02", logo),
        ("blouse", "female_elegantsuit01", ()),
    ):
        img = proxies.detail_texture(f"clothes/{suit}/{suit}_diffuse.png", 1024, blank=blank)
        out.append(
            proxies.build(ctx, f"Outfit_{cut}", f"clothes/{suit}/{suit}.mhclo", proxies.textured(f"outfit_{cut}", img))
        )

    # slip mini: a strapless satin bodice on the tights helper, a fitted skirt
    # from the skirt helper ending mid-thigh
    bust = h["shoulder"] - 0.1
    waist = h["hip"] + 0.1
    hem = h["hip"] - 0.2
    top = shell(ctx, "Outfit_mini", ["helper-tights"], [(waist - 0.04, bust)], 0.002, satin)
    sk = shell(ctx, "mini_skirt", ["helper-skirt"], [(hem, waist)], 0.003, satin)
    taper(sk, waist, hem, 0.05)
    out.append(join(top, sk))

    # faux fur: a cropped jacket with sleeves to the wrist, over a skirt
    coat = shell(
        ctx, "Outfit_fur", ["helper-tights"], [(waist + 0.02, h["neck"] - 0.04)], 0.022, fur, arms=1.1
    )
    sk2 = shell(ctx, "fur_skirt", ["helper-skirt"], [(hem, waist)], 0.003, satin)
    taper(sk2, waist, hem, 0.05)
    out.append(join(coat, sk2))

    # boutique and closet garments, each its own cut (see OUTFITS in
    # src/game/look.ts); all from the tights and skirt helpers
    velour = bpy.data.materials.new("velour")
    sequin = bpy.data.materials.new("sequin")
    ankle = h["ankle"] + 0.02
    knee = h["knee"]
    midthigh = (h["hip"] + knee) / 2

    # Y2K velour tracksuit: a zip hoodie to the wrists, flared track pants
    hood = shell(ctx, "Outfit_tracksuit-y2k", ["helper-tights"], [(waist - 0.03, h["neck"] - 0.035)], 0.012, velour, arms=1.1)
    pants = shell(ctx, "tracksuit_pants", ["helper-tights"], [(ankle, waist - 0.01)], 0.006, velour)
    flare(ctx, pants)
    out.append(join(hood, pants))

    # baby tee and pleated mini: a fitted cropped tee with cap sleeves over a
    # short skirt that kicks out at the hem
    tee = shell(ctx, "Outfit_baby-tee-mini", ["helper-tights"], [(waist + 0.07, h["neck"] - 0.05)], 0.004, cloth, arms=0.55)
    sk3 = shell(ctx, "babytee_skirt", ["helper-skirt"], [(hem + 0.05, waist)], 0.004, cloth)
    taper(sk3, waist, hem + 0.05, -0.18)
    out.append(join(tee, sk3))

    # sequin slip gown: a strapless bodice and a skirt stretched to the ankle
    bod = shell(ctx, "Outfit_sequin-slip", ["helper-tights"], [(waist - 0.04, bust)], 0.002, sequin)
    gown = shell(ctx, "slip_gown", ["helper-skirt"], [(hem, waist)], 0.004, sequin)
    stretch(gown, waist, hem, ankle + 0.03)
    taper(gown, waist, ankle + 0.03, -0.25)
    out.append(join(bod, gown))

    # glam faux-fur wrap: a long, plush coat to mid-thigh over a satin mini
    wrap = shell(ctx, "Outfit_glam-faux-fur", ["helper-tights"], [(waist - 0.02, h["neck"] - 0.03)], 0.03, fur, arms=1.1)
    tail = shell(ctx, "wrap_tail", ["helper-skirt"], [(hem - 0.04, waist + 0.02)], 0.032, fur)
    taper(tail, waist, hem - 0.04, -0.12)
    out.append(join(wrap, tail))

    # corset and maxi skirt: a laced bodice cinched at the waist, a full
    # skirt to the floor
    cor = shell(ctx, "Outfit_corset-maxi", ["helper-tights"], [(waist - 0.06, bust + 0.01)], 0.003, satin)
    maxi = shell(ctx, "corset_skirt", ["helper-skirt"], [(hem, waist - 0.04)], 0.006, cloth)
    stretch(maxi, waist - 0.04, hem, ankle)
    taper(maxi, waist - 0.04, ankle, -0.55)
    out.append(join(cor, maxi))

    # cargo pants and a tank: wide, roomy legs to the ankle and a cropped
    # vest top
    tank = shell(ctx, "Outfit_cargo-crop", ["helper-tights"], [(waist + 0.09, bust + 0.03)], 0.003, cloth, arms=0.15)
    cargo = shell(ctx, "cargo_pants", ["helper-tights"], [(ankle, waist - 0.01)], 0.022, cloth)
    out.append(join(tank, cargo))

    # sundress: a fitted bodice and a skirt flaring to the knee
    sun = shell(ctx, "Outfit_sundress", ["helper-tights"], [(waist - 0.03, bust + 0.01)], 0.003, cloth)
    swing = shell(ctx, "sundress_skirt", ["helper-skirt"], [(hem, waist - 0.02)], 0.005, cloth)
    stretch(swing, waist - 0.02, hem, knee - 0.02)
    taper(swing, waist - 0.02, knee - 0.02, -0.4)
    out.append(join(sun, swing))

    # cropped hoodie and biker shorts
    crop = shell(ctx, "Outfit_hoodie-bikers", ["helper-tights"], [(waist + 0.08, h["neck"] - 0.035)], 0.012, cloth, arms=1.1)
    bikers = shell(ctx, "biker_shorts", ["helper-tights"], [(midthigh, waist - 0.01)], 0.003, satin)
    out.append(join(crop, bikers))

    # swimsuits. The bikini's leg line dips to the crotch and rises over the
    # hips to a thin side, lower at the back for fuller cover (front is -y)
    def leg_line(x, y):
        rise = 1.25 if y < 0 else 0.8
        # never above the waistband: a 1.5 cm strap stays over each hip
        return min(h["hip"] - 0.105 + abs(x) * rise, h["hip"] + 0.005)

    out.append(
        shell(ctx, "Swim_one-piece", ["helper-tights"], [(h["hip"] - 0.08, bust + 0.015)], 0.0015, cloth, arms=0.2)
    )
    out.append(
        shell(
            ctx,
            "Swim_bikini",
            ["helper-tights"],
            [(bust - 0.1, bust + 0.01), (leg_line, h["hip"] + 0.02)],
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
    gloss = bpy.data.materials.new("shoe_gloss")
    out.append(platforms(ctx, "Shoes_platforms", h["ankle"] + 0.02, gloss))
    out.append(platforms(ctx, "Shoes_boots", h["knee"] - 0.06, gloss))
    for ob in out:
        tuck(ctx, body, body_src, ob, ob.name.split("_", 1)[1])
    return out


PLATFORM = 0.05  # sole height in metres; the client lifts the doll by this


def hull2d(pts):
    """Convex hull of 2D points, counter-clockwise (monotone chain)."""
    p = sorted(map(tuple, pts))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for q in p:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], q) <= 0:
            lower.pop()
        lower.append(q)
    for q in reversed(p):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], q) <= 0:
            upper.pop()
        upper.append(q)
    return np.array(lower[:-1] + upper[:-1])


def chaikin(ring, rounds):
    """Rounds a closed polygon's corners by corner cutting."""
    for _ in range(rounds):
        nxt = np.roll(ring, -1, axis=0)
        ring = np.stack([ring * 0.75 + nxt * 0.25, ring * 0.25 + nxt * 0.75], 1).reshape(-1, 2)
    return ring


def platforms(ctx, name, top, mat):
    """Y2K platforms: an upper cut from the tights helper around the foot (up
    to `top`, so ankle pumps or knee boots) on a chunky sole block per foot.
    The sole hangs below the foot; the client lifts the doll to stand on it."""
    upper = shell(ctx, name, ["helper-tights"], [(-1.0, top)], 0.0035, mat, arms=0.2)
    co = np.array([v.co[:] for v in upper.data.vertices])
    foot_bones = [ctx.BONES.index(b) for b in ("lFoot", "rFoot")]
    sole_parts = []
    for side, bone in (("l", "lFoot"), ("r", "rFoot")):
        sel = co[(co[:, 0] > 0) == (side == "l")]
        sel = sel[sel[:, 2] < ctx.JB[bone][2] + 0.01]
        # the sole follows the foot's own outline (rounded toe, narrower
        # heel), a few millimetres proud of it, extruded straight down
        mid = sel[:, :2].mean(0)
        out = mid + (sel[:, :2] - mid) * 1.06
        ring = chaikin(hull2d(out), 3)
        bm = bmesh.new()
        top = [bm.verts.new((x, y, 0.012)) for x, y in ring]
        bot = [bm.verts.new((x, y, -PLATFORM)) for x, y in ring]
        n = len(ring)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
        bm.faces.new(top)
        bm.faces.new(bot[::-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f"{name}_{side}_sole")
        bm.to_mesh(me)
        bm.free()
        sole = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(sole)
        mod = sole.modifiers.new("bevel", "BEVEL")
        mod.width = 0.008
        mod.segments = 3
        mod.limit_method = "ANGLE"  # round the rims, not the hull's facets
        bpy.context.view_layer.objects.active = sole
        bpy.ops.object.select_all(action="DESELECT")
        sole.select_set(True)
        bpy.ops.object.modifier_apply(modifier="bevel")
        for poly in sole.data.polygons:
            poly.use_smooth = True
        sole.data.materials.append(mat)
        n = len(sole.data.vertices)
        w = np.zeros((n, len(ctx.BONES)))
        w[:, ctx.BONES.index(bone)] = 1
        proxies.attach(ctx, sole, w, {k: np.zeros((n, 3)) for k in ctx.KEYS})
        sole_parts.append(sole)
    for sole in sole_parts:
        upper = join(upper, sole)
    upper["lift"] = PLATFORM
    return upper


def join(a, b):
    bpy.ops.object.select_all(action="DESELECT")
    a.select_set(True)
    b.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    return a
