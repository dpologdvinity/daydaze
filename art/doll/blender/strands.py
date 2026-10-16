"""Strand-card hair: hundreds of thin, tapered cards rooted on the scalp,
combed away from a parting, falling under gravity with a wave or curl, and
kept clear of the head and shoulders. Each card carries a generated strand
texture with soft alpha, so the hair reads as many fine strands rather than
a few wide ribbons. The style parameters cover hair types and lengths.
"""

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

import proxies

STRAND_TEX = None


def strand_texture(size=(256, 1024), seed=3):
    """A lock of hair: a soft, dense core with hundreds of fine strands over
    it, low in contrast so the hair reads as one glossy mass that breaks
    into strands at its edges and tips. Roots at v=0, tips at v=1."""
    global STRAND_TEX
    if STRAND_TEX is not None:
        return STRAND_TEX
    w, h = size
    rng = np.random.default_rng(seed)
    v = np.linspace(0, 1, h)[:, None]
    u = np.linspace(-1, 1, w)[None, :]
    # the lock's body: opaque in the middle, feathering to the sides and tip
    core = np.clip(1 - np.abs(u) ** 2.2, 0, 1) * np.clip((1 - v) / 0.35, 0, 1) ** 0.6
    alpha = np.clip(core * 1.3, 0, 1)
    shade = np.full((h, w), 0.86, np.float32)
    x = np.arange(w)[None, :]
    for _ in range(420):
        cx = rng.uniform(0, w)
        drift = rng.uniform(-5, 5)
        width = rng.uniform(0.5, 1.2)
        length = rng.uniform(0.7, 1.0)
        tone = rng.uniform(0.72, 1.0)
        centre = cx + drift * v**1.4 + 1.5 * np.sin(v * rng.uniform(3, 7) + rng.uniform(0, 6))
        a = np.clip(1 - np.abs(x - centre) / width, 0, 1) * np.clip((length - v) / 0.12, 0, 1)
        alpha = np.maximum(alpha, a * 0.9)
        shade = shade * (1 - a * 0.5) + tone * a * 0.5
    img = np.zeros((h, w, 4), np.float32)
    img[..., 0] = img[..., 1] = img[..., 2] = shade
    img[..., 3] = alpha
    im = bpy.data.images.new("strands", w, h, alpha=True)
    im.pixels.foreach_set(img[::-1].ravel())
    im.pack()
    STRAND_TEX = im
    return im


def scalp_points(ctx, count, rng, front_line=0.0):
    """Area-weighted random root points over the head skin above the
    hairline, with their surface normals."""
    from doll_hair import hairline  # avoid a cycle at import time

    head_i = ctx.BONES.index("head")
    tris = []
    for f in ctx.FACES["body"]:
        if ctx.W[f][:, head_i].min() < 0.98:
            continue
        pts = ctx.PB[f]
        c = pts.mean(0)
        if c[2] < hairline(ctx, c[0], c[1]) + front_line:
            continue
        for k in range(1, len(f) - 1):
            tris.append((pts[0], pts[k], pts[k + 1]))
    tris = np.array(tris)
    area = np.linalg.norm(np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0]), axis=1)
    pick = rng.choice(len(tris), size=count, p=area / area.sum())
    out = []
    for i in pick:
        a, b, c = tris[i]
        r1, r2 = rng.random(2)
        if r1 + r2 > 1:
            r1, r2 = 1 - r1, 1 - r2
        p = a + (b - a) * r1 + (c - a) * r2
        n = np.cross(b - a, c - a)
        n /= np.linalg.norm(n) + 1e-9
        out.append((p, n))
    return out


def build(ctx, name, mat, length=0.42, count=420, wave=0.0, curl=0.0, volume=1.0, part=0.0, seed=1):
    """A strand-card hairstyle.

    length: metres from root to tip (before gravity), wave: amplitude of a
    slow S-wave (metres), curl: amplitude of tight spirals, volume: how far
    the hair lifts off the scalp, part: the parting's x offset (metres).
    """
    rng = np.random.default_rng(seed)
    head = np.array(ctx.JB["head"])
    # the head as an ellipsoid, a touch bigger than the skull, for collision
    top_z = max(p[2] for p in ctx.PB[[i for f in ctx.FACES["body"] for i in f if ctx.W[i, ctx.BONES.index("head")] > 0.98]])
    centre = np.array([head[0], head[1] + 0.01, top_z - 0.105])
    radii = np.array([0.077, 0.094, 0.11]) * (1 + 0.03 * volume)
    shoulder_z = ctx.JB["lArm"][2]
    shoulder_x = abs(ctx.JB["lArm"][0]) + 0.05
    neck_y = head[1]

    eye_z = ctx.JB["lEye"][2]
    face_half = 0.078

    def push_out(p, layer):
        # keep the face clear: strands in front of the face below the brow
        # move out to the sides and frame it instead of covering the eyes
        if p[1] < head[1] - 0.02 and p[2] < eye_z + 0.035 and abs(p[0]) < face_half + layer:
            p[0] = np.sign(p[0] or 1) * (face_half + layer)
        # outside the head ellipsoid
        d = (p - centre) / (radii + layer)
        r = np.linalg.norm(d)
        if r < 1:
            p = centre + d / r * (radii + layer)
        # lengths below the jaw drape inside the shoulder line, not off it
        if p[2] < shoulder_z + 0.12:
            limit = shoulder_x - 0.04
            if abs(p[0]) > limit:
                p[0] = np.sign(p[0]) * (limit + (abs(p[0]) - limit) * 0.35)
        # behind and over the shoulders: a rounded slab below the neck
        if p[2] < shoulder_z + 0.06:
            depth = 0.15 + layer  # half thickness of the upper back/chest
            sx = max(0.0, abs(p[0]) - shoulder_x)
            if p[1] < neck_y + depth and abs(p[0]) < shoulder_x + 0.02 and p[1] > neck_y - depth:
                # hair over the back: rest against it, not inside
                p[1] = max(p[1], neck_y + depth * (1 - sx))
        return p

    verts, faces, uvs, root_src, shade = [], [], [], [], []
    segments = 16
    gravity = np.array([0, 0, -1.0])

    def guide(root, normal, lift, L, phase):
        """One clump's path from the scalp: combed from the parting, lifted
        off the head by `lift`, then falling under gravity."""
        side = np.sign(root[0] - part) or 1
        # crown and sides comb out from the part; the back falls straight
        back = np.clip((root[1] - head[1]) / 0.06, 0, 1)
        comb = np.array([side * 0.75 * (1 - back), 0.55, -0.35 - 0.6 * back])
        comb = comb - normal * np.dot(comb, normal)
        comb /= np.linalg.norm(comb) + 1e-9
        d = comb + normal * (0.12 + 0.25 * lift) * volume
        d /= np.linalg.norm(d)
        pts = [root + normal * (0.002 + lift * 0.004)]
        for k in range(1, segments + 1):
            t = k / segments
            pull = min(1.0, 0.2 + t * 2.2)
            d = d * (1 - pull * 0.55) + gravity * pull * 0.55
            d /= np.linalg.norm(d)
            p = pts[-1] + d * (L / segments)
            sway = np.array([np.cos(phase), np.sin(phase), 0])
            p = p + sway * wave * np.sin(t * 9 + phase) * (L / segments) * 3
            if curl:
                ang = t * 40 + phase
                p = p + np.array([np.cos(ang), np.sin(ang), 0]) * curl * (0.4 + t)
            # outer layers stand further off the head: real volume, no hollow
            pts.append(push_out(p, (0.003 + lift * 0.014) * volume + 0.004 * t))
        return np.array(pts)

    def card(pts, width, twist, dark, root):
        base = len(verts)
        for k, p in enumerate(pts):
            t = k / segments
            tan = pts[min(k + 1, segments)] - pts[max(k - 1, 0)]
            tan /= np.linalg.norm(tan) + 1e-9
            out = p - centre
            out /= np.linalg.norm(out) + 1e-9
            across = np.cross(tan, out)
            across /= np.linalg.norm(across) + 1e-9
            # turn the card about the strand, so the hair has depth from the side
            across = across * np.cos(twist) + np.cross(tan, across) * np.sin(twist)
            half = width * (1 - 0.55 * t) / 2
            verts.extend([p - across * half, p + across * half])
            # each card is one whole lock: feathered strands at both edges,
            # its core down the middle (mirrored at random for variety)
            flip = root[0] > 0
            uvs.extend([(1.0 if flip else 0.0, 1 - t), (0.0 if flip else 1.0, 1 - t)])
            shade.extend([dark, dark])
        for k in range(segments):
            a = base + 2 * k
            faces.append((a, a + 1, a + 3, a + 2))
        root_src.append((base, len(verts), root))

    # three layers, inside out: a dense dark under-layer that fills the
    # volume, the main body of the hair, and fine wisps on top
    for lift, share, width, dark in ((0.0, 0.35, 0.04, 0.6), (0.5, 0.45, 0.028, 0.85), (1.0, 0.2, 0.016, 1.0)):
        guides = max(8, int(count * share / 5))
        for root, normal in scalp_points(ctx, guides, rng):
            L = length * rng.uniform(0.85, 1.0)
            phase = rng.uniform(0, 2 * np.pi)
            g = guide(root, normal, lift, L, phase)
            # a clump: strands near the guide, loose at the root, gathered at the tip
            for _ in range(5):
                spread = rng.normal(0, 0.008, 3)
                gather = np.linspace(1, 0.35, segments + 1)[:, None]
                card(
                    g + spread * gather,
                    width * rng.uniform(0.8, 1.2),
                    rng.uniform(-0.25, 0.25),
                    dark * rng.uniform(0.92, 1.05),
                    root,
                )

    ob = ctx.new_object(name, np.array(verts), faces)
    ob.data.materials.append(mat)
    ob["layer_shade"] = list(map(float, shade))
    uv = ob.data.uv_layers.new(name="UVMap").data
    for poly in ob.data.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            uv[li].uv = uvs[ob.data.loops[li].vertex_index]
    # every card rides the scalp vertex nearest its root
    head_i = ctx.BONES.index("head")
    skin = np.array(sorted({i for f in ctx.FACES["body"] for i in f if ctx.W[i, head_i] > 0.98}))
    tree = KDTree(len(skin))
    for i, p in enumerate(ctx.PB[skin]):
        tree.insert(p, i)
    tree.balance()
    src = np.zeros(len(verts), int)
    for start, end, root in root_src:
        src[start:end] = skin[tree.find(root)[1]]
    proxies.attach(ctx, ob, ctx.W[src], {k: d[src] for k, d in ctx.KEYS.items()})
    return ob


def material(name):
    return proxies.textured(name, strand_texture(), alpha=True)
