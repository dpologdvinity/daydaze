"""Strand-card hair: hundreds of thin, tapered cards rooted on the scalp,
combed away from a parting, falling under gravity with a wave or curl, and
kept clear of the head and shoulders. Each card wears a hand-drawn lock
from the Hair Pack's atlas (clumps, gaps and wispy ends), so the hair reads
as many fine strands rather than a few wide ribbons. The style parameters
cover hair types and lengths.
"""

import os

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

import proxies

STRAND_TEX = None
ATLAS_TEX = None
CAP_TEX = None

# The cards' locks: the long clump strips of the Hair Pack's long-waves atlas
# (part 2, style 109; CC-BY 4.0 rendysix, docs/assets.md), roots at the top
# (Blender v runs up). A generated strand image read as flat, evenly toned
# ribbons up close; these are drawn with clumps, gaps and wisps.
ATLAS = "hair-pack-part-2/textures/hair109Diffuse_21.png"
STRIPS = ((0.014, 0.243), (0.26, 0.488))
V_ROOT, V_TIP = 0.975, 0.02
# its outer edges are single strands: alone at mid range they read stringy
INSET = 0.12


def lock_v(t, span=1.0):
    """The strip's v at `t` (0 root to 1 tip) along a card that wears
    `span` of the strip from its root (its wisps start the lock softly on
    the hair under it; short hair stops before the wispy tips, or a pixie is
    all fuzz)."""
    return V_ROOT - (V_ROOT - V_TIP) * span * t


def lock_u(rng, span=1.0):
    """A card's two u edges: one strip, inset from its loose edges (more on
    short locks, which would otherwise be all fuzz), and mirrored at random
    for variety."""
    s0, s1 = STRIPS[rng.integers(len(STRIPS))]
    inset = INSET + 0.15 * (1 - span) / 0.55
    s0, s1 = s0 + (s1 - s0) * inset, s1 - (s1 - s0) * inset
    return (s1, s0) if rng.random() < 0.5 else (s0, s1)


def atlas_texture():
    """The Hair Pack atlas, grayed for tinting like the pack styles' own."""
    global ATLAS_TEX
    if ATLAS_TEX is None:
        import pack_hair

        img = bpy.data.images.load(os.path.join(pack_hair.PACK_DIR, ATLAS))
        ATLAS_TEX = pack_hair.grey_atlas(pack_hair._pixels(img), "strands")
        bpy.data.images.remove(img)
    return ATLAS_TEX


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
    # a narrow solid core, so a card's outer half is separate strands and
    # neighbouring cards read as hair, not ribbons; it thins out from mid-length
    core = np.clip(1 - np.abs(u) ** 1.3, 0, 1) * np.clip((0.9 - v) / 0.45, 0, 1) ** 0.8
    alpha = np.clip(core * 1.15, 0, 1)
    # ragged roots: each column starts a little further along, so card roots
    # (and the hairline they make) break up instead of cutting straight across
    start = np.convolve(rng.uniform(0, 0.03, w), np.ones(5) / 5, "same")[None, :]
    roots = np.clip((v - start) / 0.015, 0, 1)
    shade = np.full((h, w), 0.8, np.float32)
    x = np.arange(w)[None, :]
    for _ in range(700):
        cx = rng.uniform(0, w)
        drift = rng.uniform(-5, 5)
        width = rng.uniform(0.45, 1.1)
        # no strand outlives the core: lone strand ends past it alias into
        # specks floating below the hair at a distance
        length = rng.uniform(0.6, 0.88)
        tone = rng.uniform(0.45, 1.1)
        centre = cx + drift * v**1.4 + 1.5 * np.sin(v * rng.uniform(3, 7) + rng.uniform(0, 6))
        a = np.clip(1 - np.abs(x - centre) / width, 0, 1) * np.clip((length - v) / 0.2, 0, 1)
        alpha = np.maximum(alpha, a * 0.92)
        shade = shade * (1 - a * 0.75) + tone * a * 0.75
    img = np.zeros((h, w, 4), np.float32)
    img[..., 0] = img[..., 1] = img[..., 2] = shade
    img[..., 3] = alpha * roots
    im = bpy.data.images.new("strands", w, h, alpha=True)
    im.pixels.foreach_set(img[::-1].ravel())
    im.pack()
    STRAND_TEX = im
    return im


def scalp_points(ctx, count, rng, front_line=0.0, max_above=None):
    """Area-weighted random root points over the head skin above the
    hairline, with their surface normals."""
    from doll_hair import hairline  # avoid a cycle at import time

    tris = []
    for f in ctx.FACES["body"]:
        if ctx.HEADW[f].min() < 0.98:
            continue
        pts = ctx.PB[f]
        c = pts.mean(0)
        line = hairline(ctx, c[0], c[1])
        if c[2] < line + front_line:
            continue
        # only the band of scalp within `max_above` of the hairline (baby hairs)
        if max_above is not None and c[2] > line + max_above:
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


def build(
    ctx, name, mat, length=0.42, count=420, wave=0.0, curl=0.0, volume=1.0, part=0.0, seed=1, tie=None, side=None,
    crown=None, edge=None
):
    """A strand-card hairstyle.

    length: metres from root to tip (before gravity), wave: amplitude of a
    slow S-wave (metres), curl: amplitude of tight spirals, volume: how far
    the hair lifts off the scalp, part: the parting's x offset (metres).
    tie: (y, z) offset from the head joint of a ponytail's tie, or (x, y, z)
    for one off to the side (a pigtail); every strand is combed flat over
    the scalp to it, then falls `length` as one tail, out the way the tie
    points. side: +1 or -1 keeps only the roots on that side of the part.
    """
    rng = np.random.default_rng(seed)
    # about one segment per 4.5 cm, so long hair bends smoothly, not in
    # kinks, within the triangle budget of a club full of dolls
    segments = int(np.clip(round(length / 0.045), 10, 13))
    head = np.array(ctx.JB["head"])
    # the head as an ellipsoid, a touch bigger than the skull, for collision
    top_z = max(p[2] for p in ctx.PB[[i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.98]])
    centre = np.array([head[0], head[1] + 0.01, top_z - 0.105])
    radii = np.array([0.077, 0.094, 0.11]) * (1 + 0.03 * volume)
    shoulder_z = ctx.JB["lArm"][2]
    shoulder_x = abs(ctx.JB["lArm"][0]) + 0.05

    eye_z = ctx.JB["lEye"][2]
    face_half = 0.082

    # the body itself, for hair resting on the back and shoulders: a strand
    # point inside the skin (or within the margin) moves out along the normal
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    skin = BVHTree.FromPolygons([tuple(p) for p in ctx.PB], [list(f) for f in ctx.FACES["body"]])

    def off_body(p, margin):
        loc, nrm = skin.find_nearest(Vector(p))[:2]
        if loc is None:
            return p
        loc, nrm = np.array(loc), np.array(nrm)
        depth = np.dot(p - loc, nrm)
        return p if depth >= margin else p + nrm * (margin - depth)

    def push_out(p, layer):
        # keep the face clear: strands in front of the face below the brow
        # move out to the sides and frame it instead of covering the eyes
        # (up to the brows' top, so no lock hangs over them)
        if p[1] < head[1] - 0.02 and p[2] < eye_z + 0.045 and abs(p[0]) < face_half + layer:
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
        # behind and over the shoulders: rest on the body, never inside it
        # (a margin for clothes and the curvier figures)
        if p[2] < shoulder_z + 0.1:
            p = off_body(p, 0.02 + layer)
        return p

    verts, faces, uvs, root_src, shade, hue = [], [], [], [], [], []
    # which atlas strip each card wears, apart from the layout's draws
    looks = np.random.default_rng(seed + 101)
    gravity = np.array([0, 0, -1.0])

    if tie is not None and len(tie) == 2:
        tie = (0.0, tie[0], tie[1])
    tie_at = None if tie is None else head + np.array(tie, float)
    # a tail leaves the band back and a little up, or out to its side
    tail_dir = np.array([0.0, 0.8, 0.25])
    if tie is not None and abs(tie[0]) > 0.02:
        tail_dir = np.array([np.sign(tie[0]) * 0.8, 0.35, 0.1])
    tail_dir /= np.linalg.norm(tail_dir)
    if tie_at is not None:
        segments = 14
    over = 6  # of a ponytail strand's segments, how many cross the scalp
    # slicked hair, and any lock over the top of the head, lies on the real
    # skull, not the collision ellipsoid (a centimeter off it at the brow)
    scalp_f = [f for f in ctx.FACES["body"] if ctx.HEADW[f].min() > 0.98]
    skull = BVHTree.FromPolygons([tuple(p) for p in ctx.PB], [list(f) for f in scalp_f])

    def forehead(p):
        """1 for a point over the forehead (within about 35 degrees of
        straight ahead), easing to 0 by 50 degrees, at the temples."""
        a = np.arctan2(abs(p[0] - head[0]), head[1] - p[1])
        return float(np.clip((0.87 - a) / 0.26, 0, 1))

    def on_skull(p, off):
        loc, nrm = skull.find_nearest(Vector(p))[:2]
        return np.array(loc) + np.array(nrm) * off

    def tied(root, normal, lift, L, phase):
        """A ponytail strand: slicked over the scalp to the tie, then out
        and down in a tail that gathers tight at the band and loosens below."""
        pts = [root + normal * 0.002]
        for k in range(1, over + 1):
            s = k / over
            p = root + (tie_at - root) * s
            # hugging the skull, a little proud of it towards the band
            pts.append(on_skull(p, 0.005 + 0.004 * lift + 0.006 * s * s))
        jitter = rng.normal(0, 1, 3) * np.array([1, 0.6, 1])
        d = tail_dir.copy()
        p = tie_at.copy()
        for k in range(1, segments - over + 1):
            t = k / (segments - over)
            d = d * 0.55 + gravity * 0.45
            d /= np.linalg.norm(d)
            p = p + d * (L / (segments - over))
            spread = jitter * (0.006 + 0.03 * np.sin(min(t, 1) * np.pi * 0.8))
            q = p + spread
            if wave:
                q = q + np.array([np.cos(phase), 0, 0]) * wave * np.sin(t * 7 + phase)
            pts.append(push_out(q, 0.004 + 0.006 * lift))
        return np.array(pts)

    def guide(root, normal, lift, L, phase):
        """One clump's path from the scalp: combed from the parting, lifted
        off the head by `lift`, then falling under gravity."""
        if tie_at is not None:
            return tied(root, normal, lift, L, phase)

        def layer_at(t):
            # rising to its layer over the first segments: straight up off
            # the scalp, a lock's root stood up as a tuft
            rise = np.clip(t * segments / 2, 0.25, 1)
            return ((0.003 + lift * 0.014) * volume + 0.004 * t) * rise

        def hug(p, t):
            """Over the top of the head a lock lies on it, its layer's depth
            off the skull: left straight it left the curve as a spike off
            the crown or a slab hovering in front of the forehead. Below the
            head's middle it falls free."""
            k = np.clip((p[2] - centre[2] + 0.02) / 0.04, 0, 1)
            return p + (on_skull(p, 0.004 + layer_at(t)) - p) * k if k > 0 else p

        side = np.sign(root[0] - part) or 1
        # crown and sides comb out from the part; the back falls straight
        back = np.clip((root[1] - head[1]) / 0.06, 0, 1)
        # over the forehead "back" points into the head, which leaves only
        # sideways and down across the face: there it is combed up and back
        # over the head, away from the face, instead. The temples keep the
        # usual comb, so their locks fall beside the face and frame it.
        front = forehead(root)
        comb = np.array([side * 0.75 * (1 - back) * (1 - 0.6 * front), 0.55, -0.35 - 0.6 * back + 1.2 * front])
        comb = comb - normal * np.dot(comb, normal)
        comb /= np.linalg.norm(comb) + 1e-9
        # hair lies close over the crown; only volume styles stand up off it
        d = comb + normal * (0.08 + 0.15 * lift) * volume
        d /= np.linalg.norm(d)
        pts = [root + normal * (0.002 + lift * 0.004)]
        for k in range(1, segments + 1):
            t = k / segments
            pull = min(1.0, 0.2 + t * 2.2)
            # the same bend per metre whatever the segment count
            keep = (1 - pull * 0.55) ** (10 / segments)
            d = d * keep + gravity * (1 - keep)
            d /= np.linalg.norm(d)
            p = pts[-1] + d * (L / segments)
            sway = np.array([np.cos(phase), np.sin(phase), 0])
            p = p + sway * wave * np.sin(t * 9 + phase) * (L / segments) * 3
            if curl:
                ang = t * 40 + phase
                p = p + np.array([np.cos(ang), np.sin(ang), 0]) * curl * (0.4 + t) * (10 / segments)
            # outer layers stand further off the head: real volume, no hollow
            pts.append(push_out(hug(p, t), layer_at(t)))
        # the clamps in push_out leave corners; relax them, then re-clear
        # the head and body, so every strand falls in one smooth curve
        # (not curls: their spiral turns most of a circle per segment, and
        # relaxing would comb them straight)
        pts = np.array(pts)
        for _ in range(0 if curl else 3):
            pts[1:-1] = pts[1:-1] * 0.5 + (pts[:-2] + pts[2:]) * 0.25
            for k in range(1, len(pts)):
                pts[k] = push_out(hug(pts[k], k / segments), layer_at(k / segments))
        return pts

    def card(pts, width, twist, dark, root):
        base = len(verts)
        # long locks wear the whole strip, short ones its root half
        span = np.clip(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum() / 0.45, 0.45, 1)
        s0, s1 = lock_u(looks, span)
        # warmer or cooler than its neighbors: real hair is many tones
        warm = looks.uniform(-1, 1)
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
            if tie_at is not None:
                # slicked strands thin to nothing over the scalp (the combed
                # cap shows there), gathering into the tail at the band
                half *= np.clip((k / over - 0.4) / 0.6, 0, 1) ** 2
            verts.extend([p - across * half, p + across * half])
            # each card is one whole lock, root to tip
            v = lock_v(t, span)
            uvs.extend([(s0, v), (s1, v)])
            shade.extend([dark, dark])
            hue.extend([warm, warm])
        for k in range(segments):
            a = base + 2 * k
            faces.append((a, a + 1, a + 3, a + 2))
        root_src.append((base, len(verts), root))

    # the mass: one continuous sheet woven between guide strands rooted round
    # the sides and back of the head, wearing the strand texture tiled round
    # it. Cards alone leave gaps and stiff blades; real hair falls as a body.
    if tie_at is None and length > 0.15:
        ring = 56
        tiles = 14
        centre_z = centre[2] + 0.015
        rows = []
        for i in range(ring + 1):
            # -90 to 90 degrees from the back (+y): its edges stay behind the
            # ears, under the cards, never edge-on beside the face
            th = np.radians(-90 + 180 * i / ring)
            d = np.array([np.sin(th), np.cos(th), 0.0])
            root = centre + d * radii * np.array([1.0, 1.0, 0]) + np.array([0, 0, centre_z - centre[2]])
            normal = d.copy()
            g = guide(root, normal, 0.2, length * 0.97, i * 0.37)
            rows.append(g)
        for i in range(ring + 1):
            base = len(verts)
            # the dense middle of a strip, mirrored back and forth round
            # the head so neighboring columns meet without a seam
            s0, s1 = STRIPS[0]
            zig = 1 - abs((i * tiles * 2 / ring) % 2 - 1)
            u = s0 + (s1 - s0) * (0.3 + 0.4 * zig)
            for k, p in enumerate(rows[i]):
                t = k / segments
                verts.append(p)
                uvs.append((u, lock_v(t)))
                # in the shadow of the cards over it: depth, not the surface
                shade.append(0.55)
                hue.append(0.0)
            if i:
                prev = base - (segments + 1)
                for k in range(segments):
                    faces.append((prev + k, base + k, base + k + 1, prev + k + 1))
            # rides the scalp vertex under its root, like the cards
            root_src.append((base, len(verts), rows[i][0]))

    # three layers, inside out: a dense dark under-layer that fills the
    # volume, the main body of the hair, and fine wisps on top
    for lift, share, width, dark in ((0.0, 0.25, 0.04, 0.72), (0.5, 0.45, 0.028, 0.88), (1.0, 0.2, 0.016, 1.0)):
        guides = max(8, int(count * share / 5))
        # loose hair's roots reach a little below the cap's edge, so the
        # hairline is made of their ragged roots, not the cap's cut (slicked
        # strands would project onto the face from there)
        below = -0.008 if tie_at is None else 0.0
        # crown: roots only that far above the hairline (shaved sides);
        # edge: only within that band of it (baby hairs)
        roots = scalp_points(
            ctx,
            guides * (2 if side else 1),
            rng,
            front_line=crown if crown is not None else below,
            max_above=edge,
        )
        if side:
            # one side of the part only (a hair over, so the part closes)
            roots = [(r, n) for r, n in roots if (r[0] - part) * side > -0.004][:guides]
        for root, normal in roots:
            # inner layers end higher, under the outer ones: their dark tips
            # hanging below read as specks on the back
            L = length * rng.uniform(0.85, 1.0) * (0.85 + 0.15 * lift)
            phase = rng.uniform(0, 2 * np.pi)
            # the wide, dark under-layer fills the volume behind: over the
            # front of the head (where the cap does that) its wide cards
            # read as flat slabs across the forehead
            if lift == 0.0 and tie_at is None and root[1] < head[1] - 0.01:
                continue
            # over the face the cap's feathered edge is the hairline: locks
            # start behind it, so their fading roots lie on hair, not as a
            # sawtooth against the forehead
            if tie_at is None and forehead(root) > 0.5:
                from doll_hair import hairline

                if root[2] < hairline(ctx, root[0], root[1]) + 0.02:
                    continue
            g = guide(root, normal, lift, L, phase)
            # each lock catches the light its own way, so locks read apart
            lock = rng.uniform(0.84, 1.1)
            # a clump: strands near the guide, loose at the root, gathered at the tip
            for _ in range(5):
                spread = rng.normal(0, 0.008, 3)
                gather = np.linspace(1, 0.35, segments + 1)[:, None]
                card(
                    g + spread * gather,
                    width * rng.uniform(0.8, 1.2) * (0.7 if tie_at is not None else 1),
                    rng.uniform(-0.25, 0.25) * (0.3 if tie_at is not None else 1),
                    dark * lock * rng.uniform(0.95, 1.03),
                    root,
                )

    ob = ctx.new_object(name, np.array(verts), faces)
    ob.data.materials.append(mat)
    ob["layer_shade"] = list(map(float, shade))
    ob["layer_hue"] = list(map(float, hue))
    uv = ob.data.uv_layers.new(name="UVMap").data
    for poly in ob.data.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            uv[li].uv = uvs[ob.data.loops[li].vertex_index]
    # every card rides the scalp vertex nearest its root
    skin = np.array(sorted({i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.98}))
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
    return proxies.textured(name, atlas_texture(), alpha=True)


def cap_texture():
    """The strand image for the scalp cap, with an alpha that never drops
    below about 0.45 on its own (the client scales it so the cap is opaque)
    but varies hair by hair. Where the cap's vertex alpha fades out over the
    hairline (doll_hair.feather_cap), the paler hairs outlast the gaps, so
    the hairline thins out into single hairs instead of a cut edge.

    The hairs here are a few texels wide, coarser than the strand image's: the
    cap repeats the image 32 times round the head, so up close a texel is a
    fraction of a pixel and finer hairs would blur into an even smudge."""
    global CAP_TEX
    if CAP_TEX is None:
        src = strand_texture()
        w, h = src.size
        px = np.empty(w * h * 4, np.float32)
        src.pixels.foreach_get(px)
        px = px.reshape(h, w, 4)
        rng = np.random.default_rng(7)
        x = np.arange(w)[None, :]
        v = np.linspace(0, 1, h)[:, None]
        hairs = np.zeros((h, w), np.float32)
        n = 48
        for i in range(n):
            # spread evenly across, wrapped round the tile's edges so
            # neighboring tiles meet
            cx = (i + rng.uniform(0, 1)) * w / n
            mid = cx + rng.uniform(-6, 6) * v + 1.5 * np.sin(v * rng.uniform(3, 7) + rng.uniform(0, 6))
            gap = np.abs((x - mid + w / 2) % w - w / 2)
            prof = np.clip(1 - gap / rng.uniform(1.5, 3.5), 0, 1)
            # each hair comes and goes along its length, so where the cap
            # thins out at the hairline it leaves short fine hairs, not long
            # lines hanging down the forehead
            dash = np.clip(0.5 + 0.9 * np.sin(v * rng.uniform(40, 90) + rng.uniform(0, 6)), 0, 1)
            hairs = np.maximum(hairs, prof * dash * rng.uniform(0.4, 1.0))
        # the hairs show in the color too, a little paler than the gaps
        px[..., :3] *= (0.85 + 0.3 * hairs)[..., None]
        # mostly near the floor, the hairs well above it: at the hairline's
        # thin end only the strongest few are left
        px[..., 3] = 0.45 + 0.55 * hairs**1.5
        CAP_TEX = bpy.data.images.new("strands_cap", w, h, alpha=True)
        CAP_TEX.pixels.foreach_set(np.clip(px, 0, 1).ravel())
        CAP_TEX.pack()
    return CAP_TEX


def cap_material(name):
    """The strand image again: a cap that reads as combed hair, fading into
    the skin along its hairline (doll_hair.feather_cap)."""
    return proxies.textured(name, cap_texture(), alpha=True)


def comb_cap(ctx, ob, tie=None):
    """UVs for a scalp cap so the strand image radiates from the crown's
    whorl like real hair: v runs from the whorl out, u around it. With a
    `tie` (offset from the head joint, as in build) it radiates from the
    band instead, so slicked hair runs from the hairline back to it."""
    head = np.array(ctx.JB["head"])
    co = np.array([v.co[:] for v in ob.data.vertices])
    top = co[:, 2].max()
    if tie is None:
        # the whorl sits on top of the head, a little towards the back (+y)
        whorl = np.array([head[0], head[1] + 0.035, top])
        d = co - whorl
        polar = np.arctan2(np.hypot(d[:, 0], d[:, 1]), -d[:, 2] + 0.06)
    else:
        whorl = head + np.array([0.0, tie[0], tie[1]])
        d = co - whorl
        # angle away from the band's backward axis (+y)
        polar = np.arctan2(np.hypot(d[:, 0], d[:, 2]), d[:, 1] + 0.04)
        d = d[:, [0, 2, 1]] * np.array([1, -1, 1])  # azimuth about +y
    azim = np.arctan2(d[:, 0], -d[:, 1])
    tiles = 32  # around the head: about a card's width per tile
    u = (azim / (2 * np.pi) + 0.5) * tiles
    # scaled, never clamped: a clamped row of UVs has no area, and its
    # tangents (which the hair shine runs along) come out NaN and black.
    # The strand image's middle, where its strands are thick: they reach
    # the hairline and break up its fade (cap_texture)
    v = 0.08 + polar / polar.max() * 0.5
    uv = ob.data.uv_layers.new(name="UVMap").data
    for poly in ob.data.polygons:
        us = [u[ob.data.vertices[ob.data.loops[li].vertex_index].index] for li in poly.loop_indices]
        # a face straddling the seam (down the back of the head under the
        # cards, or under the tail) takes its corners from one side of it
        wrap = max(us) - min(us) > tiles / 2
        for li in poly.loop_indices:
            i = ob.data.loops[li].vertex_index
            uu = u[i] + (tiles if wrap and u[i] < tiles / 2 else 0)
            uv[li].uv = (uu, 1 - v[i])
