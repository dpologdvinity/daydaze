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
    """A strip of fine hair strands: grey lines with soft alpha edges, roots
    at v=0 and thinning, fading tips at v=1."""
    global STRAND_TEX
    if STRAND_TEX is not None:
        return STRAND_TEX
    w, h = size
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 4), np.float32)
    v = np.linspace(0, 1, h)[:, None]
    x = np.arange(w)[None, :]
    for _ in range(140):
        cx = rng.uniform(0, w)
        drift = rng.uniform(-6, 6)
        width = rng.uniform(0.6, 1.6)
        length = rng.uniform(0.75, 1.0)
        shade = rng.uniform(0.65, 1.0)
        centre = cx + drift * v**1.5 + 2 * np.sin(v * rng.uniform(4, 9) + rng.uniform(0, 6))
        a = np.clip(1 - np.abs(x - centre) / width, 0, 1)
        a *= np.clip((length - v) / 0.15, 0, 1)  # strands end at different lengths
        img[..., 3] = np.maximum(img[..., 3], a)
        img[..., 0] = np.maximum(img[..., 0], a * shade)
    # a little density near the roots, wispy towards the tips
    img[..., 3] *= np.clip(1.15 - v * 0.5, 0, 1)
    img[..., 1] = img[..., 2] = img[..., 0]
    # grey so the client tints it; lift so a light colour stays light
    img[..., :3] = 0.55 + 0.45 * img[..., :3]
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

    verts, faces, uvs, root_src = [], [], [], []
    segments = 14
    gravity = np.array([0, 0, -1.0])
    for root, normal in scalp_points(ctx, count, rng):
        layer = rng.uniform(0.002, 0.008) * volume
        # comb along the scalp: away from the parting and back, lifted only a
        # little off the skin, then let gravity take it
        side = np.sign(root[0] - part) or 1
        # roots on the crown and sides comb outward from the part; roots at
        # the back of the head fall straight down so the back stays covered
        back = np.clip((root[1] - head[1]) / 0.06, 0, 1)
        comb = np.array([side * 0.75 * (1 - back), 0.55, -0.35 - 0.6 * back])
        comb = comb - normal * np.dot(comb, normal)
        comb /= np.linalg.norm(comb) + 1e-9
        d = comb + normal * 0.12 * volume
        d /= np.linalg.norm(d)
        L = length * rng.uniform(0.82, 1.0)
        phase = rng.uniform(0, 2 * np.pi)
        pts = [root + normal * layer]
        for s in range(1, segments + 1):
            t = s / segments
            # gravity wins quickly once the strand leaves the scalp
            pull = min(1.0, 0.2 + t * 2.2)
            d = d * (1 - pull * 0.55) + gravity * pull * 0.55
            d /= np.linalg.norm(d)
            p = pts[-1] + d * (L / segments)
            # waves sway sideways, curls spiral around the strand
            sway = np.array([np.cos(phase), np.sin(phase), 0])
            p = p + sway * wave * np.sin(t * 9 + phase) * (L / segments) * 3
            if curl:
                # ringlets: a spiral around the strand that grows towards the tip
                ang = t * 40 + phase
                p = p + np.array([np.cos(ang), np.sin(ang), 0]) * curl * (0.4 + t)
            pts.append(push_out(p, layer + 0.004 * t))
        pts = np.array(pts)
        width = rng.uniform(0.012, 0.022)
        base = len(verts)
        for s, p in enumerate(pts):
            t = s / segments
            tan = pts[min(s + 1, segments)] - pts[max(s - 1, 0)]
            tan /= np.linalg.norm(tan) + 1e-9
            out = p - centre
            out /= np.linalg.norm(out) + 1e-9
            across = np.cross(tan, out)
            across /= np.linalg.norm(across) + 1e-9
            half = width * (1 - 0.6 * t) / 2
            verts += [p - across * half, p + across * half]
            u0 = rng.uniform(0, 0.75)
            uvs += [(u0, 1 - t), (u0 + 0.25, 1 - t)]
        for s in range(segments):
            a = base + 2 * s
            faces.append((a, a + 1, a + 3, a + 2))
        root_src.append((base, len(verts), root))

    ob = ctx.new_object(name, np.array(verts), faces)
    ob.data.materials.append(mat)
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
