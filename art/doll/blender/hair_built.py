"""Hair built here because no free download covers it (#396): knotless
braids and a taper fade. Each is one object named Hair_<id>, fitted to the
doll the same way the MakeHuman proxies are: every vertex mixes the bone
weights and shape-key deltas of the skin under it.

Both styles grow from one map of the scalp (Scalp): rays from the middle of
the head, at the eyes' height, out to the skin. A ray's direction is a ring
`t` (0 at the crown, 1 on the hairline) and an azimuth `phi` (0 at the back,
+-pi at the front, + on the doll's left), so the hairline is one curve,
HAIRLINE, drawn round the forehead, temples, ears and nape. The scalp caps'
UVs are the same map laid flat as a disk (crown in the middle, hairline on
the rim), so textures generated in (t, phi) line up with the geometry.

- Knotless braids: the scalp is parted into brick-laid boxes, ring by ring
  from the crown (the rows follow the hairline); a braid roots in each box,
  lies along the scalp away from the part and falls under gravity, clear of
  the head and body: front braids fall in front of the shoulders, the rest
  behind them. A braid is a ridged ribbon textured with a real plait
  (braid_strip.py renders it from Blender's Braid Hair Curves) and bent
  normals that light it like a cord. The cap under them shows the parts.
  Where a braid hangs it rides the torso skin nearest it (never the arms),
  so it follows the back and shoulders rather than the head alone.
- Taper fade: a scalp cap whose hair thins into skin at the temples, round
  the ears and at the nape, under a few shells of short coily hair on top.
"""

import os

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import proxies

HERE = os.path.dirname(os.path.abspath(__file__))
BRAID_STRIP = os.path.join(HERE, "src", "braid-strip.png")

# The hairline: elevation (degrees above the eyes' height, seen from the
# middle of the head) by azimuth (degrees from the back of the head). The
# forehead line, the temple corners, the sideburn, up over the ear and down
# behind it to the nape. Measured on both MakeHuman heads: the ear spans
# about 76-100 degrees and -40 to 0 degrees.
HAIRLINE = (
    (0, -33),
    (40, -31),
    (60, -26),
    (70, -8),
    (78, 3),
    (90, 7),
    (100, 4),
    (105, -6),
    (110, -13),
    (116, -10),
    (124, 4),
    (134, 20),
    (150, 31),
    (180, 36),
)


def _vertex_normals(verts, faces):
    nrm = np.zeros_like(verts)
    for f in faces:
        p = verts[f]
        n = np.cross(p[1] - p[0], p[2] - p[0])
        if len(f) == 4:
            n = n + np.cross(p[2] - p[0], p[3] - p[0])
        nrm[list(f)] += n
    return nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)


def _triangles(faces):
    return [t for f in faces for t in ([f] if len(f) == 3 else [(f[0], f[1], f[2]), (f[0], f[2], f[3])])]


def _barycentric(p, a, b, c):
    v0, v1, v2 = b - a, c - a, p - a
    d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
    d20, d21 = v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    v = (d11 * d20 - d01 * d21) / den
    w = (d00 * d21 - d01 * d20) / den
    return np.clip(np.array([1 - v - w, v, w]), 0, 1)


class Skin:
    """The body's skin as a BVH, for where a point lies on it: the nearest
    skin point and its smooth normal, and the three vertices (with
    barycentric weights) whose bone weights and shape keys it takes."""

    def __init__(self, ctx, faces):
        self.ctx = ctx
        self.tris = np.array(_triangles(faces))
        self.normals = _vertex_normals(ctx.PB, faces)
        self.bvh = BVHTree.FromPolygons([tuple(p) for p in ctx.PB], [tuple(t) for t in self.tris])

    def _at(self, loc, index):
        tri = self.tris[index]
        loc = np.array(loc)
        bary = _barycentric(loc, *self.ctx.PB[tri])
        nrm = bary @ self.normals[tri]
        return loc, nrm / np.linalg.norm(nrm), tri, bary

    def nearest(self, p):
        loc, _, index, _ = self.bvh.find_nearest(Vector(p))
        return self._at(loc, index)

    def ray(self, origin, direction):
        loc, _, index, _ = self.bvh.ray_cast(Vector(origin), Vector(direction))
        return None if loc is None else self._at(loc, index)


class Scalp:
    """The polar map of the scalp (see the module docstring)."""

    def __init__(self, ctx):
        self.ctx = ctx
        eye_z = ctx.JB["lEye"][2]
        head = [f for f in ctx.FACES["body"] if ctx.HEADW[f].min() > 0.5]
        self.skin = Skin(ctx, head)
        pts = ctx.PB[np.unique(np.concatenate(head))]
        up = pts[pts[:, 2] > eye_z]
        self.centre = np.array([0.0, (up[:, 1].max() + up[:, 1].min()) / 2, eye_z])
        # (t, phi) -> skin point and normal on a fine grid, for the metric
        # the textures need (metres per unit t and per radian of phi)
        self.T = np.linspace(0, 1, 49)
        self.PHI = np.linspace(-np.pi, np.pi, 241)
        grid = [[self.hit(t, f)[0] for f in self.PHI] for t in self.T]
        self.grid = np.array(grid)
        self.dt = np.linalg.norm(np.gradient(self.grid, self.T, axis=0), axis=2)
        self.dphi = np.linalg.norm(np.gradient(self.grid, self.PHI, axis=1), axis=2)

    def hairline(self, phi):
        """The hairline's elevation (radians) at azimuth phi."""
        deg = np.degrees(np.abs(phi))
        a, e = zip(*HAIRLINE)
        return np.radians(np.interp(deg, a, e))

    def direction(self, t, phi):
        e = np.pi / 2 - t * (np.pi / 2 - self.hairline(phi))
        return np.array([np.cos(e) * np.sin(phi), np.cos(e) * np.cos(phi), np.sin(e)])

    def hit(self, t, phi):
        """Skin point, normal, triangle and barycentric weights at (t, phi)."""
        return self.skin.ray(self.centre, self.direction(t, phi))

    def metric(self, t, phi):
        """Metres per unit t and per radian of phi near (t, phi) (arrays)."""
        i = np.clip(np.round(np.asarray(t) * (len(self.T) - 1)).astype(int), 0, len(self.T) - 1)
        j = np.clip(np.round((np.asarray(phi) + np.pi) / (2 * np.pi) * (len(self.PHI) - 1)).astype(int), 0, len(self.PHI) - 1)
        return self.dt[i, j], self.dphi[i, j]

    def locate(self, p):
        """(t, phi) of the ray through point p."""
        d = np.asarray(p) - self.centre
        phi = np.arctan2(d[0], d[1])
        e = np.arcsin(np.clip(d[2] / np.linalg.norm(d), -1, 1))
        return (np.pi / 2 - e) / (np.pi / 2 - self.hairline(phi)), phi

    def uv(self, t, phi):
        """The cap's UVs: the scalp as a disk, crown in the middle."""
        r = 0.48 * t
        return 0.5 + r * np.sin(phi), 0.5 - r * np.cos(phi)

    def texel_coords(self, size):
        """(t, phi) of every texel of a size x size cap texture (rows from
        the image's bottom, as Blender stores them)."""
        v, u = np.mgrid[0:size, 0:size]
        x = (u + 0.5) / size - 0.5
        y = (v + 0.5) / size - 0.5
        t = np.hypot(x, y) / 0.48
        phi = np.arctan2(x, -y)
        return t, phi

    def cap(self, name, rings, segments, lift, t_max=1.0, atlas=(0.0, 0.0, 1.0), keep=None):
        """A grid over the scalp from the crown to t_max, `lift(t, phi)`
        metres off the skin; returns the object and, per vertex, its skin
        triangle and barycentric weights (for attach). `atlas` (u0, v0,
        scale) puts its UV disk in a corner of a shared texture; `keep(t,
        phi)` drops the faces whose middle it rejects."""
        verts, tris, barys, uvs = [], [], [], []

        def add(t, phi):
            p, n, tri, bary = self.hit(t, phi)
            verts.append(p + n * lift(t, phi))
            tris.append(tri)
            barys.append(bary)
            u, v = self.uv(t, phi)
            uvs.append((atlas[0] + u * atlas[2], atlas[1] + v * atlas[2]))
            return len(verts) - 1

        crown = add(0.0, 0.0)
        ts = np.linspace(0, t_max, rings + 1)[1:]
        phis = np.linspace(-np.pi, np.pi, segments, endpoint=False)
        grid = [[add(t, f) for f in phis] for t in ts]
        faces = [(crown, grid[0][(j + 1) % segments], grid[0][j]) for j in range(segments)]
        mids = [(ts[0] / 2, phis[j] + np.pi / segments) for j in range(segments)]
        for r in range(rings - 1):
            for j in range(segments):
                k = (j + 1) % segments
                faces.append((grid[r][j], grid[r][k], grid[r + 1][k], grid[r + 1][j]))
                mids.append(((ts[r] + ts[r + 1]) / 2, phis[j] + np.pi / segments))
        if keep is not None:
            faces = [f for f, (t, f_phi) in zip(faces, mids) if keep(t, f_phi)]
            used = sorted({i for f in faces for i in f})
            remap = {o: n for n, o in enumerate(used)}
            faces = [tuple(remap[i] for i in f) for f in faces]
            verts, tris, barys, uvs = ([x[i] for i in used] for x in (verts, tris, barys, uvs))
        ob = self.ctx.new_object(name, np.array(verts), faces)
        # the disk's UVs are continuous all the way round: one per vertex
        uv_layer = ob.data.uv_layers.new(name="UVMap").data
        uvs = np.array(uvs)
        for poly in ob.data.polygons:
            for li in poly.loop_indices:
                uv_layer[li].uv = uvs[ob.data.loops[li].vertex_index]
        for p in ob.data.polygons:
            p.use_smooth = True
        return ob, np.array(tris), np.array(barys)


def skin_mix(ctx, tris, barys):
    """Bone weights and shape-key deltas for vertices on skin triangles."""
    weights = np.einsum("nk,nkb->nb", barys, ctx.W[tris])
    keys = {k: np.einsum("nk,nkd->nd", barys, d[tris]) for k, d in ctx.KEYS.items()}
    return weights, keys


def image(name, rgba):
    """A packed Blender image from an (h, w, 4) float array, bottom row first."""
    h, w = rgba.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(rgba, np.float32).ravel())
    img.pack()
    return img


def _noise(shape, scale, rng):
    """Smooth value noise in [0, 1] on a grid `shape`, features about
    `scale` texels across (bilinear upsampling of random values)."""
    h, w = shape
    gh, gw = int(np.ceil(h / scale)) + 2, int(np.ceil(w / scale)) + 2
    g = rng.random((gh, gw))
    y = np.arange(h) / scale
    x = np.arange(w) / scale
    y0, x0 = y.astype(int), x.astype(int)
    fy, fx = (y - y0)[:, None], (x - x0)[None, :]
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]
    b = g[y0][:, x0 + 1]
    c = g[y0 + 1][:, x0]
    d = g[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


# ---------------------------------------------------------------- braids


class Parts:
    """Brick-laid box parts over the scalp: a round crown section, then
    RINGS rows out to the hairline, each row cut into boxes about `size`
    metres wide, every other row offset by half a box."""

    def __init__(self, scalp, rows, size, seed):
        self.scalp = scalp
        rng = np.random.default_rng(seed)
        self.crown = 0.07
        # row edges in t, each wobbling a little round the head
        self.edges = np.linspace(self.crown, 1.0, rows + 1)
        self.wobble = [(rng.uniform(-0.02, 0.02), rng.uniform(0, 2 * np.pi)) for _ in self.edges]
        self.wobble[-1] = (0.0, 0.0)
        self.cuts = []
        phis = np.linspace(-np.pi, np.pi, 721)
        for r in range(rows):
            t = (self.edges[r] + self.edges[r + 1]) / 2
            ring = np.array([scalp.hit(t, f)[0] for f in phis])
            arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(ring, axis=0), axis=1))])
            n = max(5, int(round(arc[-1] / size)))
            # box edges at equal arc lengths round the row, offset by half a
            # box on odd rows, each nudged up to a quarter of a box
            s = (np.arange(n) + 0.5 * (r % 2) + rng.uniform(-0.25, 0.25, n)) / n * arc[-1]
            self.cuts.append(np.sort(np.interp(np.mod(s, arc[-1]), arc, phis)))

    def edge(self, r, phi):
        amp, ph = self.wobble[r]
        return self.edges[r] + amp * np.sin(3 * phi + ph)

    def row(self, t, phi):
        """Row index of (t, phi) arrays: -1 for the crown section."""
        r = np.full(np.shape(t), -1)
        for k in range(len(self.edges) - 1):
            r = np.where(t >= self.edge(k, phi), k, r)
        return r

    def boxes(self):
        """(row, t, phi) of every box's middle, crown first."""
        out = [(-1, 0.0, 0.0)]
        for r, cuts in enumerate(self.cuts):
            nxt = np.roll(cuts, -1)
            nxt[-1] += 2 * np.pi
            mids = (cuts + nxt) / 2
            mids = np.mod(mids + np.pi, 2 * np.pi) - np.pi
            for f in mids:
                out.append((r, float((self.edge(r, f) + self.edge(r + 1, f)) / 2), float(f)))
        return out

    def texel_parts(self, t, phi):
        """For texel (t, phi) arrays: the distance (metres) to the nearest
        part line, and the offset (metres, across and along the scalp) to
        its box's middle, where the braid roots."""
        dt_m, dphi_m = self.scalp.metric(np.clip(t, 0, 1), phi)
        row = self.row(t, phi)
        dist = np.full(t.shape, np.inf)
        off_t = np.zeros(t.shape)
        off_phi = np.zeros(t.shape)
        # the crown section: a disk
        crown = row < 0
        dist[crown] = (self.edge(0, phi[crown]) - t[crown]) * dt_m[crown]
        off_t[crown] = t[crown] * dt_m[crown]
        for r, cuts in enumerate(self.cuts):
            m = row == r
            if not m.any():
                continue
            tm, fm = t[m], phi[m]
            lo, hi = self.edge(r, fm), self.edge(r + 1, fm)
            d_row = np.minimum(tm - lo, hi - tm) * dt_m[m]
            # the box's cut edges round the ring (wrapping at +-pi)
            k = np.searchsorted(cuts, fm)
            left = cuts[(k - 1) % len(cuts)]
            right = cuts[k % len(cuts)]
            dl = np.mod(fm - left, 2 * np.pi)
            dr = np.mod(right - fm, 2 * np.pi)
            d_cut = np.minimum(dl, dr) * dphi_m[m]
            dist[m] = np.minimum(d_row, d_cut)
            off_t[m] = (tm - (lo + hi) / 2) * dt_m[m]
            off_phi[m] = (dl - (dl + dr) / 2) * dphi_m[m]
        # past the hairline
        dist[t > 1] = -1
        return dist, off_t, off_phi


def braid_cap_texture(parts, size=1024, seed=4):
    """The scalp under the braids: each box's hair drawn tight toward its
    braid's root, the part lines between boxes cut away (alpha 0) so the
    doll's own skin shows in them, a soft broken edge at the hairline."""
    rng = np.random.default_rng(seed)
    t, phi = parts.scalp.texel_coords(size)
    dist, off_t, off_phi = parts.texel_parts(t, phi)
    # strands run toward the root: their direction is the offset's, and the
    # pattern across them is noise in the angle round the root
    ang = np.arctan2(off_phi, off_t)
    r = np.hypot(off_t, off_phi)
    streak = _noise((size, size), 2.5, rng)
    fine = 0.5 + 0.5 * np.sin(ang * 70 + streak * 9)
    # in the braids' shade: darker than the braids over it
    g = 0.5 + 0.18 * fine * np.clip(r / 0.004, 0, 1)
    # hair is pulled tight at the root and thins toward the part edges
    g *= 0.8 + 0.2 * np.clip(dist / 0.003, 0, 1)
    # parts: under a millimetre of skin, their edges broken by stray hairs
    edge = 0.0004 + 0.00015 * (_noise((size, size), 3, rng) - 0.5)
    alpha = np.clip((dist - edge) / 0.0003, 0, 1)
    # the hairline: baby hairs, a ragged fade over the last few millimetres
    t_len = parts.scalp.metric(np.clip(t, 0, 1), phi)[0]
    to_line = (1 - t) * t_len
    ragged = 0.0015 + 0.002 * _noise((size, size), 6, rng)
    alpha = np.minimum(alpha, np.clip((to_line - ragged) / 0.0015, 0, 1))
    alpha[t > 1] = 0
    return np.dstack([g, g, g, alpha])


class Drape:
    """Moves points along a braid out of the head and body: at least
    `margin` metres off the skin (exactly that, where the braid lies on the
    head), out to the side of the face rather than over it."""

    def __init__(self, ctx, scalp):
        self.ctx = ctx
        self.skin = Skin(ctx, ctx.FACES["body"])
        # what a braid rides: the nearest skin off the arms, so a braid by
        # the arm doesn't swing with it
        arm = [i for i, b in enumerate(ctx.BONES) if any(k in b for k in ("Arm", "Hand"))]
        armw = ctx.W[:, arm].sum(1)
        self.anchor = Skin(ctx, [f for f in ctx.FACES["body"] if armw[f].max() < 0.2])
        self.scalp = scalp
        self.eye_z = ctx.JB["lEye"][2]
        self.face_y = scalp.centre[1] - 0.05

    def past_shoulder(self, p, front, margin):
        """Where a braid leaving the head at p should cross the top of the
        shoulder: a little below it, `margin` behind the back (or in front
        of the chest) at the same side."""
        z = self.ctx.JB["lArm"][2] - 0.05
        x = p[0] * 0.92
        start, toward = (np.array([x, -0.5, z]), (0, 1, 0)) if front else (np.array([x, 0.5, z]), (0, -1, 0))
        hit = self.skin.bvh.ray_cast(Vector(start), Vector(toward))[0]
        y = p[1] if hit is None else hit.y + (-margin if front else margin)
        return np.array([x, y, z])

    def __call__(self, p, margin, hug=False):
        # keep the face clear: below the brow and in front of the cheeks,
        # a braid moves out to the side of it
        half = 0.082 + margin
        if p[1] < self.face_y and p[2] < self.eye_z + 0.04 and p[2] > self.eye_z - 0.16 and abs(p[0]) < half:
            p = p.copy()
            p[0] = np.sign(p[0] or 1.0) * half
        loc, nrm, _, _ = self.skin.nearest(p)
        depth = float(np.dot(p - loc, nrm))
        # `hug`: lying on the head, exactly `margin` off it
        if depth < margin or hug:
            p = p + nrm * (margin - depth)
        _, _, tri, bary = self.anchor.nearest(p)
        return p, (tri, bary, nrm)


def braid_path(drape, root, normal, comb, length, layer, front, rng):
    """One braid's centreline: it lies along the scalp from its root in the
    comb direction, lifting onto its layer, then falls under gravity over
    the shoulders, in front of them for the front braids. Returns points
    every 6 mm with, for each, the skin under it and its normal there."""
    step = 0.006
    gravity = np.array([0.0, 0.0, -1.0])
    p = root + normal * 0.002
    d = comb
    pts, under = [p], [drape(p, 0.002)[1]]
    shoulder_z = drape.ctx.JB["lArm"][2]
    drift = rng.normal(0, 0.004, 3) * np.array([1.0, 1.0, 0.0])
    sway = np.cross(comb, gravity)
    sway /= max(np.linalg.norm(sway), 1e-6)
    phase = rng.uniform(0, 2 * np.pi)
    # where it hangs, each braid sits its own depth off the body, so the
    # fall is a mass of braids over one another, not one flat curtain
    depth = rng.uniform(0.0, 0.012)
    margin_body = 0.014 + layer * 0.6 + depth
    jaw_z = drape.eye_z - 0.09
    aim = None
    s = 0.0
    while s < length:
        s += step
        # over the top of the head a braid lies on it, held by its own
        # weight; past the skull's widest line it falls, bending into the
        # fall over a few centimetres
        on_skull = p[2] > drape.scalp.centre[2] + 0.01
        pull = 0.03 if on_skull else 0.2
        d = d * (1 - pull) + gravity * pull
        # falling, braids fan out a little from the head (an A-line), each
        # its own way
        out = (p - drape.scalp.centre) * np.array([1.0, 1.0, 0.0])
        d = d + (out / max(np.linalg.norm(out), 1e-6) * 0.004 + drift) * np.clip(s / 0.2, 0, 1)
        # and sway gently, so no two hang dead straight side by side
        d = d + sway * np.sin(s / 0.09 + phase) * 0.025 * np.clip(s / 0.15, 0, 1)
        # below the jaw it heads for its spot just behind the shoulder (or
        # in front of it, for the front braids), clear of it, so it falls
        # down the back or the chest and never along the shoulder
        if aim is None and p[2] < jaw_z:
            aim = drape.past_shoulder(p, front, margin_body)
        if aim is not None and p[2] > aim[2]:
            # out to the side of the shoulder it falls on first, then down:
            # a line straight to the spot would cut through the collarbone
            to = aim - p
            if abs(to[1]) > 0.02:
                to[2] *= 0.15
            d = d * 0.5 + to / max(np.linalg.norm(to), 1e-6) * 0.5
        d /= np.linalg.norm(d)
        # lifts off the scalp onto its layer within the first few centimetres
        margin = min(layer, 0.003 + s * 0.08)
        # and eases out to its depth off the body over the shoulders
        margin = max(margin, margin_body * np.clip((shoulder_z + 0.16 - p[2]) / 0.08, 0, 1))
        q, info = drape(p + d * step, margin, hug=on_skull)
        d = (q - p) / max(np.linalg.norm(q - p), 1e-9)
        p = q
        pts.append(p)
        under.append(info)
    pts = np.array(pts)
    # relax the corners the collisions leave, keeping the root where it is;
    # the fall below the jaw, where the braid turns for the shoulder, is
    # eased a little more, then cleared of the body again
    for _ in range(4):
        pts[1:-1] = pts[1:-1] * 0.5 + (pts[:-2] + pts[2:]) * 0.25
    low = np.where(pts[:, 2] < jaw_z + 0.03)[0]
    if len(low) > 2:
        a = max(int(low[0]), 1)
        for _ in range(10):
            pts[a:-1] = pts[a:-1] * 0.5 + (pts[a - 1 : -2] + pts[a + 1 :]) * 0.25
        for k in range(a, len(pts)):
            pts[k], under[k] = drape(pts[k], margin_body)
    return pts, under


def simplify(pts, tolerance, keep_first=6):
    """Indices of a polyline's points to keep: the first few (the root's
    bend, where the braid leaves the scalp) and any whose removal would move
    the line more than `tolerance` metres (Douglas-Peucker)."""
    keep = {0, len(pts) - 1, *range(0, min(keep_first, len(pts)), keep_first // 2)}

    def rec(a, b):
        if b <= a + 1:
            return
        seg = pts[b] - pts[a]
        L = np.linalg.norm(seg)
        rel = pts[a + 1 : b] - pts[a]
        if L < 1e-9:
            dist = np.linalg.norm(rel, axis=1)
        else:
            dist = np.linalg.norm(rel - np.outer(rel @ seg / L**2, seg), axis=1)
        k = int(np.argmax(dist))
        if dist[k] > tolerance:
            keep.add(a + 1 + k)
            rec(a, a + 1 + k)
            rec(a + 1 + k, b)

    rec(0, len(pts) - 1)
    return sorted(keep)


def braid_strip():
    """The plait texture (braid_strip.py) and its height over its width,
    shaded darker toward its sides: a ribbon carries it, and the shade is
    what makes a ribbon read as a round cord from any light."""
    img = bpy.data.images.load(BRAID_STRIP)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    # the strip spans 3.2 braid radii; x is -1..1 across the braid itself
    x = (np.arange(w) + 0.5 - w / 2) / (w / 3.2)
    round_ = 0.55 + 0.45 * np.sqrt(np.clip(1 - (x / 1.25) ** 2, 0, 1))
    px[:, :, :3] *= round_[None, :, None]
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img, h / w


def knotless(ctx, rows=8, size=0.019, width=0.0105, length=0.5, seed=11):
    """Knotless braids, shoulder to mid-back: a braid in every box part,
    starting small at the scalp (no knot) and tapering at the tip."""
    rng = np.random.default_rng(seed)
    scalp = Scalp(ctx)
    parts = Parts(scalp, rows, size, seed)
    drape = Drape(ctx, scalp)
    strip, aspect = braid_strip()
    # the strip spans 3.2 braid radii: the ribbon is that wide, and its
    # texture repeats every ribbon width * aspect along it
    ribbon = width * 3.2 / 2.6
    repeat = ribbon * aspect

    verts, faces, uvs, normals, wts = [], [], [], [], []
    n_braids = 0
    for row, t, phi in parts.boxes():
        p, n, _, _ = scalp.hit(t, phi)
        # comb: away from a middle part, down at the back; front braids fall
        # beside the face, the rest behind the shoulders
        side = np.sign(p[0]) if abs(p[0]) > 1e-4 else 1.0
        out = (p - scalp.centre) * np.array([1.0, 1.0, 0.0])
        out = out / max(np.linalg.norm(out), 1e-6) + np.array([0.0, 0.0, -0.6])
        aside = np.array([side * 0.45, 1.0, -0.2])
        w = np.clip((abs(phi) - np.radians(100)) / np.radians(35), 0, 1)
        comb = out * (1 - w) + aside * w
        if row < 0:
            # the crown's own braid lies back, down the middle
            comb = np.array([0.0, 1.0, -0.3])
        front = abs(phi) > np.radians(125)
        comb = comb - n * np.dot(comb, n)
        comb /= np.linalg.norm(comb)
        # higher roots lie over lower ones: a crown braid stands furthest out
        layer = 0.004 + 0.007 * (1 - (row + 1) / rows)
        L = length * rng.uniform(0.94, 1.06)
        n_braids += 1
        pts, under = braid_path(drape, p, n, comb, L, layer, front, rng)
        keep = simplify(pts, 0.0045)
        arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        v0 = rng.random()
        base = len(verts)
        prev_side = prev_out = None
        for i in keep:
            q = pts[i]
            tri, bary, skin_n = under[i]
            # the braid faces out of the hair: away from the skin under it,
            # turned toward the body's axis where it hangs clear, and never
            # along itself (that would twist the ribbon edge-on)
            radial = (q - scalp.centre) * np.array([1.0, 1.0, 0.0])
            radial /= max(np.linalg.norm(radial), 1e-6)
            on_head = np.clip((q[2] - (scalp.centre[2] - 0.07)) / 0.06, 0, 1)
            a, b = max(i - 1, 0), min(i + 1, len(pts) - 1)
            along = pts[b] - pts[a]
            along /= np.linalg.norm(along)
            out = skin_n * (0.5 + 0.5 * on_head) + radial * 0.5 * (1 - on_head)
            out = out - along * np.dot(out, along)
            if np.linalg.norm(out) < 0.2 and prev_out is not None:
                out = prev_out - along * np.dot(prev_out, along)
            out /= max(np.linalg.norm(out), 1e-6)
            prev_out = out
            across = np.cross(along, out)
            across /= max(np.linalg.norm(across), 1e-6)
            if prev_side is not None and np.dot(across, prev_side) < 0:
                across = -across
            prev_side = across
            face_out = np.cross(across, along)
            # knotless: a few hairs at the root, full width within 3 cm; the
            # sealed tip narrows over its last 4 cm
            s = arc[i]
            w = ribbon * min(1.0, 0.6 + 0.4 * s / 0.03) * (0.55 + 0.45 * min(1.0, (arc[-1] - s) / 0.04))
            # lying on the head a braid flattens and spreads a little, and
            # the rows close up over the parts below them
            w *= 1 + 0.35 * on_head
            # a ridged ribbon (left edge, crest, right edge): from the side it
            # still shows a face, and its bent normals light it like a cord
            for k, (side_k, lift) in enumerate(((-1, 0.0), (0, 0.45), (1, 0.0))):
                verts.append(q + across * side_k * w / 2 + face_out * lift * w)
                nn = face_out + across * side_k * 0.9
                normals.append(nn / np.linalg.norm(nn))
                uvs.append((k / 2, v0 + s / repeat))
                wts.append((tri, bary))
        n_pts = len(keep)
        for j in range(n_pts - 1):
            a = base + 3 * j
            faces.append((a, a + 1, a + 4, a + 3))
            faces.append((a + 1, a + 2, a + 5, a + 4))

    print("knotless:", n_braids, "braids")
    verts = np.array(verts)
    ob = ctx.new_object("Hair_knotless", verts, faces)
    uv_layer = ob.data.uv_layers.new(name="UVMap").data
    for poly in ob.data.polygons:
        for li in poly.loop_indices:
            uv_layer[li].uv = uvs[ob.data.loops[li].vertex_index]
    for poly in ob.data.polygons:
        poly.use_smooth = True
    ob.data.normals_split_custom_set_from_vertices([tuple(n) for n in normals])
    mat = proxies.textured("hair_knotless", strip, alpha=True)
    ob.data.materials.append(mat)
    tris = np.array([w[0] for w in wts])
    barys = np.array([w[1] for w in wts])

    # the cap of parts under the braids, just off the skin
    cap, cap_tris, cap_barys = scalp.cap("knotless_cap", 10, 48, lambda t, f: 0.0012 + 0.0008 * (1 - t))
    cap_img = image("knotless_cap", braid_cap_texture(parts))
    cap.data.materials.append(proxies.textured("knotless_cap", cap_img, alpha=True))

    # one object: braids then cap, every vertex riding the skin under it
    all_tris = np.concatenate([tris, cap_tris])
    all_barys = np.concatenate([barys, cap_barys])
    ob = _join(ob, cap)
    weights, key_d = skin_mix(ctx, all_tris, all_barys)
    proxies.attach(ctx, ob, weights, key_d)
    return ob


def _join(a, b):
    """b's mesh appended to a's (vertices, faces, UVs, materials, custom
    normals kept)."""
    bpy.ops.object.select_all(action="DESELECT")
    a.select_set(True)
    b.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    return a


# ---------------------------------------------------------------- fade


def _cells(shape, cell, rng):
    """Cellular noise: per texel, 1 at a feature point falling to 0 one
    `cell` (texels) away; one jittered point per cell, so the blobs read as
    the tight clumps short coily hair grows in."""
    h, w = shape
    gy, gx = int(np.ceil(h / cell)) + 2, int(np.ceil(w / cell)) + 2
    pts = (np.stack(np.mgrid[0:gy, 0:gx], -1) + rng.random((gy, gx, 2))) * cell
    yy, xx = np.mgrid[0:h, 0:w]
    cy, cx = (yy // cell).astype(int), (xx // cell).astype(int)
    best = np.full(shape, np.inf)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            py = pts[cy + dy, cx + dx, 0] - cell
            px = pts[cy + dy, cx + dx, 1] - cell
            best = np.minimum(best, np.hypot(yy - py, xx - px))
    return np.clip(1 - best / cell, 0, 1)


class Fade:
    """A low taper fade: hair `top` metres long over the crown, shortening
    down the sides and back to nothing at the hairline over `band` metres
    (skin showing through more and more), and a crisp edge at the front."""

    def __init__(self, scalp, top=0.011, band=0.04):
        self.scalp, self.top, self.band = scalp, top, band

    def height(self, t, phi):
        """Metres up from the hairline, along the scalp."""
        return (1 - np.asarray(t)) * self.scalp.metric(np.clip(t, 0, 1), phi)[0]

    def sides(self, phi):
        """1 where the cut fades (temples round to the nape), 0 at the
        forehead's lined-up edge."""
        return np.clip((np.radians(150) - np.abs(phi)) / np.radians(20), 0, 1)

    def density(self, t, phi):
        """How much of the scalp the hair covers (1 = all)."""
        f = np.clip(self.height(t, phi) / self.band, 0, 1)
        return 1 - self.sides(phi) * (1 - f * f * (3 - 2 * f))

    def length(self, t, phi):
        """Hair length (metres): the top's, tapering into the fade."""
        f = np.clip((self.height(t, phi) - self.band * 0.3) / (self.band * 1.4), 0, 1)
        k = f * f * (3 - 2 * f)
        crisp = 1 - self.sides(phi)
        return self.top * np.maximum(k, crisp * np.clip(self.height(t, phi) / 0.006, 0, 1))


SHELLS = 3


def fade_texture(fade, size=1024, seed=21):
    """The taper's atlas: the scalp layer in the bottom-left quarter, the
    SHELLS shells over it in the others. Each texel's coil clump height
    (cellular noise) decides which layers it shows on, so the clumps narrow
    toward their tips the way short coils do; the scalp layer thins into
    the fade with stray stubble."""
    rng = np.random.default_rng(seed)
    half = size // 2
    t, phi = fade.scalp.texel_coords(half)
    dens = fade.density(t, phi)
    clump = 0.65 * _cells((half, half), 5, rng) + 0.35 * _cells((half, half), 2.5, rng)
    stubble = _noise((half, half), 1.0, rng)
    out = np.zeros((size, size, 4), np.float32)
    inside = t <= 1.0
    # the scalp layer: dense hair (darker in the clumps' shade) in the top,
    # stubble dots thinning out through the fade
    g = 0.55 + 0.25 * clump
    a = (stubble > 1 - dens) & inside
    # the lined-up edge: hair right to it, a hairline-sharp cut
    out[:half, :half] = np.dstack([g, g, g, a.astype(np.float32)])
    for k in range(1, SHELLS + 1):
        # a shell shows the clumps that reach it: fewer, smaller and lighter
        # (their tips catch the light) the further out it is
        level = k / (SHELLS + 1)
        # (and they thin out where the hair shortens into the fade, so the
        # top blends down into it instead of ending in a ledge)
        short = 1 - np.clip(fade.length(t, phi) / fade.top, 0, 1)
        a = (clump > 0.25 + 0.55 * level + 0.45 * short) & inside
        g = (0.62 + 0.3 * level + 0.12 * (clump - 0.5)) * np.ones_like(t)
        y0, x0 = (k // 2) * half, (k % 2) * half
        out[y0 : y0 + half, x0 : x0 + half] = np.dstack([g, g, g, a.astype(np.float32)])
    return np.clip(out, 0, 1)


def taper(ctx):
    """A low taper fade with a short coily top (see the module docstring):
    the scalp layer right on the skin, then SHELLS shells stacked through
    the hair's length, only where the hair is long enough to need them."""
    scalp = Scalp(ctx)
    fade = Fade(scalp)
    img = image("taper", fade_texture(fade))
    mat = proxies.textured("hair_taper", img, alpha=True)
    layers = []
    for k in range(SHELLS + 1):
        y0, x0 = (k // 2) * 0.5, (k % 2) * 0.5
        frac = k / SHELLS

        def lift(t, phi, frac=frac):
            return 0.0008 + float(fade.length(t, phi)) * frac

        keep = None if k == 0 else (lambda t, phi: fade.length(t, phi) > 0.002)
        ob, tris, barys = scalp.cap(f"taper_{k}", 14, 72, lift, atlas=(x0, y0, 0.5), keep=keep)
        ob.data.materials.append(mat)
        # inner shells sit in the hair's own shade
        ob["layer_shade"] = [0.7 + 0.3 * frac] * len(ob.data.vertices)
        layers.append((ob, tris, barys))
    ob = layers[0][0]
    shade = list(ob["layer_shade"])
    for other, _, _ in layers[1:]:
        shade += list(other["layer_shade"])
        ob = _join(ob, other)
    ob.name = ob.data.name = "Hair_taper"
    ob["layer_shade"] = shade
    weights, keys = skin_mix(ctx, np.concatenate([x[1] for x in layers]), np.concatenate([x[2] for x in layers]))
    proxies.attach(ctx, ob, weights, keys)
    return ob


def build(ctx):
    """Every built style, for doll_hair.build."""
    return [knotless(ctx), taper(ctx)]

