"""Hair styles, all built here: strand cards over a scalp cap, plus sculpted
buns, afro and braids.

Each style is one object named Hair_<id> (ids match HAIR_STYLES in
src/game/look.ts). Textures become grey strand maps the client tints.
"""

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

import proxies
import strands

# style id -> MakeHuman proxy (none now: every style is built here)
PROXY = {}
TEXTURE = {}


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


def hairline(ctx, x, y):
    """Height of a natural hairline around the head: high over the forehead,
    low at the nape, eased between, so cut edges follow one smooth curve."""
    head = ctx.JB["head"]
    eye_z = ctx.JB["lEye"][2]
    # 0 at the back of the head (+y), 1 at the front
    f = (1 - np.cos(np.arctan2(x - head[0], y - head[1]))) / 2
    return eye_z - 0.035 + 0.085 * f**1.5


def scalp_hair(ctx, name, mat, extra, rise=0.0):
    """A slicked scalp shell (head skin above the brow line and behind the
    hairline, pushed out a few millimetres) plus whatever `extra(bm, ctx)`
    adds to the bmesh. Added verts ride the nearest scalp vertex. `rise`
    lifts the hairline, for a cap whose edge hides under strand roots."""
    eye_z = ctx.JB["lEye"][2]
    head_i = ctx.BONES.index("head")
    faces = []
    for f in ctx.FACES["body"]:
        pts = ctx.PB[f]
        if ctx.W[f][:, head_i].min() < 0.98:
            continue
        # any face reaching above the hairline; its low corners clamp to it
        if (pts[:, 2] > hairline(ctx, pts[:, 0], pts[:, 1]) + rise).any():
            faces.append(f)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    verts = ctx.to_blender(ctx.P[used])
    verts[:, 2] = np.maximum(verts[:, 2], hairline(ctx, verts[:, 0], verts[:, 1]) + rise)
    ob = ctx.new_object(name, verts, [[remap[i] for i in f] for f in faces])
    ob.data.update()
    nrm = np.array([v.normal[:] for v in ob.data.vertices])
    ob.data.vertices.foreach_set("co", (verts + nrm * 0.004).ravel())
    ob.data.materials.append(mat)
    src = np.array(used)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    extra(bm, ctx)
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True
    co = np.array([v.co[:] for v in ob.data.vertices])
    base = co[: len(used)]
    tree = KDTree(len(base))
    for i, p in enumerate(base):
        tree.insert(p, i)
    tree.balance()
    near = np.array([tree.find(p)[1] for p in co[len(used) :]], int)
    full_src = np.concatenate([src, src[near]]) if len(near) else src
    proxies.attach(
        ctx,
        ob,
        ctx.W[full_src],
        {k: d[full_src] for k, d in ctx.KEYS.items()},
    )
    return ob


def _top(bm):
    return max(v.co.z for v in bm.verts)


def buns(ctx, mat):
    """Two twisted buns on top of a slicked-back scalp."""

    def extra(bm, ctx):
        top = _top(bm)
        for side in (1, -1):
            c = Vector((side * 0.062, 0.01, top - 0.012))
            ret = bmesh.ops.create_uvsphere(
                bm, u_segments=20, v_segments=14, radius=0.045
            )
            for v in ret["verts"]:
                # a twist: ridges spiral around the bun
                d = v.co.normalized()
                ang = np.arctan2(d.y, d.x)
                v.co *= 1 + 0.06 * np.sin(ang * 5 + d.z * 6)
                v.co.z *= 0.86
                v.co += c

    return scalp_hair(ctx, "Hair_buns", mat, extra)


def top_knot(ctx, mat):
    """Slicked up into one big twisted bun on the crown."""

    def extra(bm, ctx):
        top = _top(bm)
        c = Vector((0.0, 0.02, top + 0.02))
        ret = bmesh.ops.create_uvsphere(bm, u_segments=22, v_segments=16, radius=0.062)
        for v in ret["verts"]:
            d = v.co.normalized()
            ang = np.arctan2(d.y, d.x)
            v.co *= 1 + 0.07 * np.sin(ang * 6 + d.z * 7)
            v.co.z *= 0.8
            v.co += c

    return scalp_hair(ctx, "Hair_top-knot", mat, extra)


def afro(ctx, mat):
    """An afro puff: one rounded cloud with fine curl texture, cut back from
    the face and the nape so the hairline frames the face."""
    head = ctx.JB["head"]
    eye_z = ctx.JB["lEye"][2]

    def extra(bm, ctx):
        top = _top(bm)
        centre = Vector((head[0], head[1] + 0.02, top - 0.035))
        ret = bmesh.ops.create_uvsphere(bm, u_segments=56, v_segments=36, radius=1)
        for v in ret["verts"]:
            d = v.co.copy()
            # fine curls: many small bumps over the surface
            bump = 1 + 0.05 * np.sin(d.x * 53 + d.z * 17) * np.sin(d.y * 47 + d.z * 31)
            p = Vector((d.x * 0.145, d.y * 0.15, d.z * 0.12)) * bump + centre
            line = hairline(ctx, p.x, p.y) + 0.012
            if p.z < line:
                # fold the underside in onto the hairline so the puff closes
                # on the head instead of leaving an open rim
                k = 0.098 / max(1e-6, Vector((p.x - head[0], p.y - head[1], 0)).length)
                p = Vector((head[0] + (p.x - head[0]) * min(1, k), head[1] + (p.y - head[1]) * min(1, k), line))
            v.co = p

    return scalp_hair(ctx, "Hair_afro", mat, extra)


def braids(ctx, mat, count=48, length=0.5):
    """Knotless braids: plaits from two rows round the back and sides of the
    hairline, falling behind the shoulders. Each plait is a five-sided tube
    whose radius pulses, so it reads as woven."""
    head = ctx.JB["head"]
    eye_z = ctx.JB["lEye"][2]
    shoulder_z = ctx.JB["lArm"][2]

    def extra(bm, ctx):
        top = _top(bm)
        scalp = [v.co.copy() for v in bm.verts]
        for k in range(count):
            row = k % 2
            a = np.radians(-150 + 300 * (k // 2) / (count // 2 - 1))
            # angle 0 is the back of the head (+y), +-150 the temples
            d = np.array([np.sin(a), np.cos(a)])
            z = eye_z + (0.035 if row else 0.085)
            probe = Vector((head[0] + d[0] * 0.2, head[1] + d[1] * 0.2, z))
            start = min(scalp, key=lambda c: (c - probe).length)
            rings = []
            steps = 26
            for i in range(steps):
                t = i / (steps - 1)
                zz = start.z - t * length
                # out from the scalp, then behind the shoulders below the neck
                out = 0.012 + (0.05 * min(1, (start.z - zz) / 0.12))
                xy = np.array([start.x, start.y]) + np.append(d, 0)[:2] * out
                if zz < shoulder_z + 0.05:
                    xy[1] = max(xy[1], head[1] + 0.07 + 0.05 * (shoulder_z + 0.05 - zz))
                    xy[0] *= 0.85
                r = 0.0075 * (1 + 0.35 * abs(np.sin(t * np.pi * 16)))
                rings.append((Vector((xy[0], xy[1], zz)), r))
            prev = None
            for c, r in rings:
                ring = []
                for j in range(5):
                    th = 2 * np.pi * j / 5
                    ring.append(bm.verts.new(c + Vector((np.cos(th) * r, np.sin(th) * r, 0))))
                if prev:
                    for j in range(5):
                        bm.faces.new((prev[j], prev[(j + 1) % 5], ring[(j + 1) % 5], ring[j]))
                prev = ring

    return scalp_hair(ctx, "Hair_braids", mat, extra)


def shade_strands(ctx, ob):
    """Root-to-tip shading as vertex colours: hair near the scalp sits in its
    own shadow and reads darker and denser; lengths and tips catch the light.
    The client multiplies these into the hair colour."""
    head_i = ctx.BONES.index("head")
    scalp = ctx.PB[[i for f in ctx.FACES["body"] for i in f if ctx.W[i, head_i] > 0.98]]
    tree = KDTree(len(scalp))
    for i, p in enumerate(scalp):
        tree.insert(p, i)
    tree.balance()
    me = ob.data
    attr = me.color_attributes.new("Color", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    eye_z = ctx.JB["lEye"][2]
    layer = list(ob["layer_shade"]) if "layer_shade" in ob else None
    for v in me.vertices:
        d = tree.find(v.co)[2]
        root = np.clip(d / 0.035, 0, 1)  # 0 on the scalp, 1 a few cm out
        below = np.clip((eye_z - v.co.z) / 0.25, 0, 1)  # lengths past the face
        t = np.clip(root * 0.7 + below * 0.5, 0, 1)
        g = 0.5 + 0.5 * t**0.8
        if layer is not None and v.index < len(layer):
            g *= layer[v.index]
        attr.data[v.index].color = (g, g, g, 1.0)


def strand_style(ctx, name, strand_mat, cap_mat, **style):
    """Strand cards over a scalp cap combed with the same strand image, so
    no skin shows through the parting or between cards, and what does show
    reads as hair."""
    import doll_outfits

    cap = scalp_hair(ctx, name + "_cap", cap_mat, lambda bm, ctx: None, rise=0.008)
    strands.comb_cap(ctx, cap, style.get("tie"))
    cards = strands.build(ctx, name, strand_mat, **style)
    return doll_outfits.join(cards, cap)


def pigtails(ctx, strand_mat, cap_mat):
    """Two tails tied behind the ears, parted down the middle."""
    import doll_outfits

    halves = [
        strands.build(
            ctx,
            f"Hair_pigtails_{side}",
            strand_mat,
            seed=13 + side,
            length=0.32,
            # half a head of hair each, so the pair costs one style
            count=228,
            wave=0.008,
            tie=(side * 0.07, 0.035, -0.005),
            side=side,
        )
        for side in (1, -1)
    ]
    # joining appends the others' vertices after the active object's, so the
    # strands' layer shading runs on in the same order; the cap goes last
    shade = list(halves[0]["layer_shade"]) + list(halves[1]["layer_shade"])
    out = doll_outfits.join(halves[0], halves[1])
    out["layer_shade"] = shade
    cap = scalp_hair(ctx, "Hair_pigtails_cap", cap_mat, lambda bm, ctx: None, rise=0.008)
    strands.comb_cap(ctx, cap)
    out = doll_outfits.join(out, cap)
    out.name = "Hair_pigtails"
    return out


def build(ctx):
    out = []
    for style, path in PROXY.items():
        img = proxies.detail_texture(TEXTURE[style], 1024)
        mat = proxies.textured(f"hair_{style}", img, alpha=True)
        ob = proxies.build(ctx, f"Hair_{style}", path, mat)
        if style == "ponytail":
            swing(ctx, ob, ctx.JB["head"] + np.array([0, 0.06, 0.02]))
        out.append(ob)
    solid = bpy.data.materials.new("hair_solid")
    out += [buns(ctx, solid), afro(ctx, solid), braids(ctx, solid), top_knot(ctx, solid)]
    strand = strands.material("hair_strands")
    combed = strands.cap_material("hair_cap")
    # strand-card styles: length (m), wave (slow S), curl (tight spirals),
    # volume (lift off the scalp); ids match HAIR_STYLES in src/game/look.ts
    for name, style in {
        "waves": dict(length=0.56, count=456, wave=0.01),
        "long-straight": dict(length=0.6, count=468, wave=0.002),
        "long-curly": dict(length=0.5, count=492, curl=0.022, volume=1.8),
        "mid-straight": dict(length=0.36, count=420, wave=0.002),
        "mid-wavy": dict(length=0.36, count=420, wave=0.012),
        "mid-curly": dict(length=0.3, count=456, curl=0.022, volume=1.9),
        "bob": dict(length=0.24, count=390, wave=0.002, volume=1.2),
        "pixie": dict(length=0.11, count=360, wave=0.004, volume=1.1),
        # waist-skimming waves, a choppy layered shag, and short springy coils
        "mermaid": dict(length=0.76, count=480, wave=0.024),
        "shag": dict(length=0.27, count=432, wave=0.009, volume=1.5),
        "coils": dict(length=0.2, count=468, curl=0.016, volume=1.7),
    }.items():
        out.append(strand_style(ctx, f"Hair_{name}", strand, combed, seed=len(name), **style))
    # a high ponytail: slicked back to a band at the crown's back, the tail
    # on the pony bone so it swings
    pony = strand_style(
        ctx, "Hair_ponytail", strand, combed, seed=9, length=0.42, count=420, wave=0.004, tie=(0.085, 0.045)
    )
    swing(ctx, pony, ctx.JB["head"] + np.array([0, 0.08, 0.05]))
    out.append(pony)
    # a low ponytail, tied at the nape
    low = strand_style(
        ctx, "Hair_low-pony", strand, combed, seed=11, length=0.38, count=420, wave=0.006, tie=(0.075, -0.045)
    )
    swing(ctx, low, ctx.JB["head"] + np.array([0, 0.07, -0.05]))
    out.append(low)
    out.append(pigtails(ctx, strand, combed))
    for ob in out:
        shade_strands(ctx, ob)
    return out
