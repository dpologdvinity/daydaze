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

import json
import os

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import proxies

HERE = os.path.dirname(os.path.abspath(__file__))
BRAID_STRIPS = os.path.join(HERE, "src", "braid-strips.png")

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

    def texel_points(self, t, phi):
        """Skin points at (t, phi) arrays, from the fine grid (bilinear)."""
        ft = np.clip(t, 0, 1) * (len(self.T) - 1)
        fp = (np.asarray(phi) + np.pi) / (2 * np.pi) * (len(self.PHI) - 1)
        i0 = np.clip(ft.astype(int), 0, len(self.T) - 2)
        j0 = np.clip(fp.astype(int), 0, len(self.PHI) - 2)
        a = (ft - i0)[..., None]
        b = (fp - j0)[..., None]
        g = self.grid
        top = g[i0, j0] * (1 - b) + g[i0, j0 + 1] * b
        bot = g[i0 + 1, j0] * (1 - b) + g[i0 + 1, j0 + 1] * b
        return top * (1 - a) + bot * a

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


# How the parts are laid: (stagger of every other row, in boxes; how far a
# box's middle wanders, in boxes; chance a box merges into a neighbour or
# splits; every third box left out of a row, which turns the boxes'
# Voronoi cells into triangles)
PART_STYLES = {
    "brick": (0.5, 0.3, 0.07, False),
    "box": (0.0, 0.12, 0.0, False),
    "triangle": (0.5, 0.12, 0.0, True),
}


class Parts:
    """Parts over the scalp, laid the way a braider lays them but by hand:
    rows following the hairline out from the crown, each cut into boxes
    about `size` metres wide, then every box's middle nudged and (for
    brick parts) a few boxes merged and a few split. The parts are the
    lines halfway between neighbouring middles (a Voronoi diagram), so they
    come out uneven, not a grid. `style` is a PART_STYLES key."""

    def __init__(self, scalp, rows, size, seed, style="brick"):
        self.scalp = scalp
        rng = np.random.default_rng(seed)
        stagger, wander, change, triangles = PART_STYLES[style]
        edges = np.linspace(0.07, 1.0, rows + 1)
        seeds = [(0.0, 0.0)]
        phis = np.linspace(-np.pi, np.pi, 721)
        for r in range(rows):
            t = (edges[r] + edges[r + 1]) / 2
            ring = np.array([scalp.hit(t, f)[0] for f in phis])
            arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(ring, axis=0), axis=1))])
            # triangles: the boxes come in at two thirds the size, and the
            # gaps left by every third one make the cells three-sided
            n = max(5, int(round(arc[-1] / (size * (2 / 3 if triangles else 1)))))
            j = np.arange(n)
            s = (j + stagger * (r % 2) + rng.uniform(-wander, wander, n)) / n * arc[-1]
            if triangles:
                s = s[(j + r) % 3 != 0]
            for f in np.interp(np.mod(s, arc[-1]), arc, phis):
                # a box's middle wanders up or down its row
                dt = (edges[1] - edges[0]) * rng.uniform(-wander, wander)
                seeds.append((float(np.clip(t + dt, 0.03, 0.97)), float(f)))
        keep = []
        for t, f in seeds:
            roll = rng.random()
            if roll < change and t > 0.1:
                # merged into a neighbour: one bigger box
                continue
            keep.append((t, f))
            if roll > 1 - change * 0.7:
                # split: a small box beside it
                keep.append((float(np.clip(t + rng.uniform(-0.03, 0.03), 0.03, 0.97)), f + rng.uniform(-0.06, 0.06)))
        self.seeds = keep
        hits = [scalp.hit(t, f) for t, f in keep]
        self.points = np.array([h[0] for h in hits])
        # a frame on the scalp at each middle, for the hair drawn toward it
        n = np.array([h[1] for h in hits])
        a = np.cross(n, [0.0, 0.0, 1.0])
        a /= np.maximum(np.linalg.norm(a, axis=1, keepdims=True), 1e-6)
        self.frame = (a, np.cross(n, a))

    def boxes(self):
        """(t, phi) of every box's middle, where its braid roots."""
        return self.seeds

    def texel_parts(self, pts):
        """For texel points (n, 3) on the scalp: the distance (metres) to the
        nearest part line, and the offset to its box's middle in that
        middle's own frame (two coordinates, metres)."""
        dist = np.empty(len(pts))
        near = np.empty(len(pts), int)
        for c in range(0, len(pts), 32768):
            q = pts[c : c + 32768]
            d2 = ((q[:, None, :] - self.points[None, :, :]) ** 2).sum(-1)
            two = np.argpartition(d2, 1, axis=1)[:, :2]
            d_two = np.take_along_axis(d2, two, 1)
            order = np.argsort(d_two, axis=1)
            i1 = np.take_along_axis(two, order[:, :1], 1)[:, 0]
            i2 = np.take_along_axis(two, order[:, 1:], 1)[:, 0]
            gap = np.linalg.norm(self.points[i2] - self.points[i1], axis=1)
            # distance to the bisector between the two nearest middles
            dist[c : c + 32768] = (d2[np.arange(len(q)), i2] - d2[np.arange(len(q)), i1]) / (2 * np.maximum(gap, 1e-6))
            near[c : c + 32768] = i1
        off = pts - self.points[near]
        a, b = self.frame
        return dist, (off * a[near]).sum(1), (off * b[near]).sum(1)


def braid_cap_texture(parts, size=1024, seed=4):
    """The scalp under the braids: each box's hair drawn tight toward its
    braid's root, the parts between boxes a fine dark crease (the scalp in
    the braids' shadow, so they show only up close), a soft broken edge at
    the hairline where the doll's own skin shows through."""
    rng = np.random.default_rng(seed)
    t, phi = parts.scalp.texel_coords(size)
    pts = parts.scalp.texel_points(t, phi)
    dist, u, v = parts.texel_parts(pts.reshape(-1, 3))
    dist, u, v = dist.reshape(t.shape), u.reshape(t.shape), v.reshape(t.shape)
    # strands run toward the root: their direction is the offset's, and the
    # pattern across them is noise in the angle round the root
    ang = np.arctan2(v, u)
    r = np.hypot(u, v)
    streak = _noise((size, size), 2.5, rng)
    fine = 0.5 + 0.5 * np.sin(ang * 70 + streak * 9)
    # in the braids' shade: darker than the braids over it
    g = 0.5 + 0.18 * fine * np.clip(r / 0.004, 0, 1)
    # the parts: a crease about a millimetre wide, its edge broken by
    # stray hairs, darkest in the middle
    crease = 0.0005 + 0.0002 * (_noise((size, size), 3, rng) - 0.5)
    k = np.clip(dist / crease, 0, 1)
    g *= 0.3 + 0.7 * k * k * (3 - 2 * k)
    # the hairline: baby hairs, a ragged fade over the last few millimetres
    t_len = parts.scalp.metric(np.clip(t, 0, 1), phi)[0]
    to_line = (1 - t) * t_len
    ragged = 0.0015 + 0.002 * _noise((size, size), 6, rng)
    alpha = np.clip((to_line - ragged) / 0.0015, 0, 1)
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

    def anchor_at(self, p):
        """What a point off the body rides: the skin nearest it (off the
        arms), and the skin's normal there."""
        loc, nrm, tri, bary = self.anchor.nearest(p)
        return tri, bary, nrm

    def past_shoulder(self, p, front, margin, spread=0.0):
        """Where a braid leaving the head at p should cross the top of the
        shoulder: a little below it, `margin` behind the back (or in front
        of the chest) at the same side, `spread` metres further out."""
        z = self.ctx.JB["lArm"][2] - 0.05
        side = np.sign(p[0]) if abs(p[0]) > 1e-4 else 1.0
        # (in front the throat stays clear; down the back they close ranks)
        x = side * float(np.clip(abs(p[0]) * 1.1 + spread, 0.05 if front else 0.0, 0.17))
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
    # (the cap under the braids stands 2-3 mm off the skin, so a cap face
    # never dips under the skull's curve between its corners)
    p = root + normal * 0.0035
    d = comb
    pts, under = [p], [drape(p, 0.0035)[1]]
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
    # how far out over the shoulder it lands: the fall widens from the head
    # to the shoulders, and braids layer over them
    spread = rng.uniform(-0.01, 0.05)
    # below the skull the braids hang as a curtain round the neck, not
    # collapsed onto it: bulk behind the ears and a full silhouette
    curtain = 0.088 + layer + depth * 0.6
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
            aim = drape.past_shoulder(p, front, margin_body, spread)
        if aim is not None and p[2] > aim[2]:
            # out to the side of the shoulder it falls on first, then down:
            # a line straight to the spot would cut through the collarbone
            to = aim - p
            if abs(to[1]) > 0.02:
                to[2] *= 0.15
            d = d * 0.5 + to / max(np.linalg.norm(to), 1e-6) * 0.5
        d /= np.linalg.norm(d)
        # lifts off the scalp onto its layer within the first few centimetres
        margin = min(max(layer, 0.0045), 0.0035 + s * 0.08)
        # and eases out to its depth off the body over the shoulders
        margin = max(margin, margin_body * np.clip((shoulder_z + 0.16 - p[2]) / 0.08, 0, 1))
        q = p + d * step
        if not on_skull and q[2] > shoulder_z + 0.02:
            h = (q - drape.scalp.centre) * np.array([1.0, 1.0, 0.0])
            r = np.linalg.norm(h)
            if 1e-6 < r < curtain:
                q = q + h / r * (curtain - r)
        q, info = drape(q, margin, hug=on_skull)
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


def braid_strips():
    """The shared lock atlas (braid_strip.py): the image, shaded darker
    toward each column's sides (a ribbon carries it, and the shade is what
    makes a ribbon read as a round cord from any light), and per lock its
    u range and aspect (the texture repeats every ribbon width * aspect)."""
    img = bpy.data.images.load(BRAID_STRIPS)
    with open(BRAID_STRIPS.replace(".png", ".json")) as f:
        meta = json.load(f)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    col = w // len(meta)
    # each column spans 3.2 lock radii; x is -1..1 across the lock itself
    x = (np.arange(w) % col + 0.5 - col / 2) / (col / 3.2)
    round_ = 0.55 + 0.45 * np.sqrt(np.clip(1 - (x / 1.25) ** 2, 0, 1))
    px[:, :, :3] *= round_[None, :, None]
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img, meta


# Braid sizes: (part size, braid width), metres
SIZES = {"small": (0.018, 0.0105), "medium": (0.025, 0.0145), "jumbo": (0.034, 0.02)}

# The braid variants: one row each. size: SIZES; length: root to tip,
# metres; parts: PART_STYLES; worn: down, pony (a high ponytail), bun (a top
# bun), half (the top half up in a ponytail, the rest down); lock: the
# atlas column (plait or twist); ends: plain, or curls (goddess braids: the
# ends and a few loose locks through them curl).
BRAIDS = [
    dict(id="knotless", label="Knotless braids", size="small", length=0.5, parts="brick", worn="down"),
    dict(id="knotless-waist", label="Waist-length knotless", size="medium", length=0.7, parts="box", worn="down"),
    dict(id="jumbo-box", label="Jumbo box braids", size="jumbo", length=0.34, parts="box", worn="down"),
    dict(id="goddess", label="Goddess braids", size="medium", length=0.52, parts="brick", worn="down", ends="curls"),
    dict(id="braid-pony", label="Braided high pony", size="small", length=0.55, parts="triangle", worn="pony"),
    dict(id="braid-bun", label="Braided top bun", size="small", length=0.5, parts="brick", worn="bun"),
    dict(id="braid-half-up", label="Half-up braids", size="medium", length=0.5, parts="triangle", worn="half"),
    dict(id="twists", label="Senegalese twists", size="medium", length=0.46, parts="triangle", worn="down", lock="twist"),
]


def tied_path(drape, root, normal, layer, tie, length, mode, rng):
    """A braid gathered to a tie: it lies over the scalp straight to the tie,
    then either falls from it as a tail (mode "pony", out and back first) or
    wraps once round a bun on it (mode "bun"). Returns points every 6 mm,
    the skin under each, and the arc length at the tie."""
    step = 0.006
    p = root + normal * 0.0035
    pts, under = [p], [drape(p, 0.0035)[1]]
    s = 0.0
    while np.linalg.norm(p - tie) > 0.012 and s < length * 0.8:
        s += step
        margin = min(max(layer, 0.0045), 0.0035 + s * 0.08)
        d = tie - p
        d /= max(np.linalg.norm(d), 1e-9)
        q, info = drape(p + d * step, margin, hug=True)
        p = q
        pts.append(p)
        under.append(info)
    at_tie = s
    centre = drape.scalp.centre
    up = tie - centre
    up /= np.linalg.norm(up)
    if mode == "bun":
        # one loop and a half round the bun at its own height on it (most
        # braids; the rest tuck in under it at the tie), wider the higher
        # the braid's layer
        if rng.random() < 0.4:
            return np.array(pts), under, at_tie
        bun = tie + up * 0.03
        side = np.cross(up, [1.0, 0.0, 0.0])
        side /= np.linalg.norm(side)
        other = np.cross(up, side)
        lat = rng.uniform(-0.45, 1.25)
        r = 0.046 + layer * 1.2
        a0 = np.arctan2(np.dot(p - bun, other), np.dot(p - bun, side))
        turn = rng.uniform(1.0, 1.5) * 2 * np.pi
        n = int(turn * r / step)
        for k in range(1, n + 1):
            a = a0 + turn * k / n
            # in toward the bun from the tie over the first quarter turn
            e = lat * min(1.0, k / (n * 0.25))
            q = bun + (np.cos(a) * side + np.sin(a) * other) * r * np.cos(e) + up * r * np.sin(e)
            pts.append(q)
            under.append(drape.anchor_at(q))
        return np.array(pts), under, at_tie
    # a tail: out and back from the tie, then down under gravity
    tail = up * 0.5 + np.array([0.0, 1.0, 0.0])
    tail /= np.linalg.norm(tail)
    jitter = rng.normal(0, 1, 3)
    jitter -= tail * np.dot(jitter, tail)
    jitter /= max(np.linalg.norm(jitter), 1e-6) / min(1.0, abs(rng.normal(0, 0.6)))
    # the tail fans out from the band, a thick fall of braids
    p = tie + jitter * 0.008
    d = tail + jitter * 0.45
    d /= np.linalg.norm(d)
    gravity = np.array([0.0, 0.0, -1.0])
    depth = rng.uniform(0.0, 0.01)
    while s < length:
        s += step
        d = d * 0.88 + gravity * 0.12
        d /= np.linalg.norm(d)
        q, info = drape(p + d * step, 0.012 + depth)
        d = (q - p) / max(np.linalg.norm(q - p), 1e-9)
        p = q
        pts.append(p)
        under.append(info)
    pts = np.array(pts)
    for _ in range(4):
        pts[1:-1] = pts[1:-1] * 0.5 + (pts[:-2] + pts[2:]) * 0.25
    return pts, under, at_tie


def braid_style(ctx, v, rows=8, seed=11):
    """One BRAIDS variant (a row `v`): its near model and its hand-made far
    one, Hair_<id> and Hair_<id>@lo."""
    rng = np.random.default_rng(seed)
    size, width = SIZES[v["size"]]
    length = v["length"]
    worn = v.get("worn", "down")
    scalp = Scalp(ctx)
    parts = Parts(scalp, rows, size, seed, v.get("parts", "brick"))
    drape = Drape(ctx, scalp)
    strips, locks = braid_strips()
    # each atlas column spans 3.2 lock radii: a ribbon is that wide, and
    # its texture repeats every ribbon width * aspect along it
    ribbon = width * 3.2 / 2.6
    lock = v.get("lock", "plait")
    # the ties: a high ponytail at the back of the crown, a bun on top
    ties = {
        "pony": scalp.hit(0.32, 0.0),
        "half": scalp.hit(0.3, 0.0),
        "bun": scalp.hit(0.12, 0.0),
    }

    paths = []
    for t, phi in parts.boxes():
        p, n, _, _ = scalp.hit(t, phi)
        layer = 0.004 + 0.007 * (1 - t)
        L = length * rng.uniform(0.94, 1.06)
        v0 = rng.random()
        mode = worn
        if worn == "half":
            # the top half (crown to the front and sides above the ears) up
            mode = "pony" if t < 0.62 and abs(phi) > np.radians(45) or t < 0.3 else "down"
        if mode in ("pony", "bun"):
            hit = ties[mode if worn != "half" else "half"]
            tie = hit[0] + hit[1] * (0.01 + 0.004)
            pts, under, at_tie = tied_path(drape, p, n, layer, tie, L * (0.75 if worn == "half" else 1.0), mode, rng)
            arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
            # a tail rides the pony bone, so it swings
            pony = at_tie if mode == "pony" else None
            paths.append(dict(pts=pts, under=under, arc=arc, v0=v0, lock=lock, s0=0.0, s1=arc[-1], pony=pony))
            continue
        # comb: away from a middle part, down at the back; braids from the
        # temples forward sweep back past the face and fall in front of the
        # shoulders, framing it; the rest fall behind
        side = np.sign(p[0]) if abs(p[0]) > 1e-4 else 1.0
        out = (p - scalp.centre) * np.array([1.0, 1.0, 0.0])
        out = out / max(np.linalg.norm(out), 1e-6) + np.array([0.0, 0.0, -0.6])
        aside = np.array([side * 0.45, 1.0, -0.2])
        w = np.clip((abs(phi) - np.radians(100)) / np.radians(35), 0, 1)
        comb = out * (1 - w) + aside * w
        if t < 0.06:
            # the crown's own braid lies back, down the middle
            comb = np.array([0.0, 1.0, -0.3])
        front = abs(phi) > np.radians(105)
        comb = comb - n * np.dot(comb, n)
        comb /= np.linalg.norm(comb)
        pts, under = braid_path(drape, p, n, comb, L, layer, front, rng)
        arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        if v.get("ends") == "curls":
            # goddess: the last 12 cm comes loose in a curl, and every third
            # braid has a loose curly lock falling alongside it
            cut = arc[-1] - 0.12
            paths.append(dict(pts=pts, under=under, arc=arc, v0=v0, lock=lock, s0=0.0, s1=cut, pony=None))
            paths.append(dict(pts=pts, under=under, arc=arc, v0=v0, lock="curl", s0=cut - 0.01, s1=arc[-1], pony=None, scale=1.15))
            if len(paths) % 3 == 0:
                shifted = pts + np.cross(pts[-1] - pts[0], [0.0, 0.0, 1.0]) * 0.02
                paths.append(dict(pts=shifted, under=under, arc=arc, v0=rng.random(), lock="curl", s0=0.06, s1=arc[-1] * 0.8, pony=None, scale=1.2))
            continue
        paths.append(dict(pts=pts, under=under, arc=arc, v0=v0, lock=lock, s0=0.0, s1=arc[-1], pony=None))
    if worn in ("pony", "half"):
        # one braid wrapped twice round the base of the ponytail, as a band
        hit = ties[worn]
        centre = hit[0] + hit[1] * 0.014
        axis = hit[1] * 0.5 + np.array([0.0, 1.0, 0.0])
        axis /= np.linalg.norm(axis)
        e1 = np.cross(axis, [1.0, 0.0, 0.0])
        e1 /= np.linalg.norm(e1)
        e2 = np.cross(axis, e1)
        a = np.linspace(0, 4 * np.pi, 120)
        r = 0.016 if worn == "pony" else 0.012
        ring = centre + np.outer(np.cos(a), e1) * r + np.outer(np.sin(a), e2) * r + np.outer(a / (4 * np.pi) - 0.5, axis) * 0.012
        under = [drape.anchor_at(q) for q in ring]
        under = [(tri, bary, np.cos(x) * e1 + np.sin(x) * e2) for (tri, bary, _), x in zip(under, a)]
        arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(ring, axis=0), axis=1))])
        paths.append(dict(pts=ring, under=under, arc=arc, v0=0.3, lock=lock, s0=0.05, s1=arc[-1], pony=None))
    print(v["id"], len(paths), "ribbons")

    # the cap of parts under the braids, just off the skin
    cap_img = image(f"{v['id']}_cap", braid_cap_texture(parts))

    def cap(name, rings, segments):
        ob, tris, barys = scalp.cap(name, rings, segments, lambda t, f: 0.0022 + 0.001 * (1 - t))
        ob.data.materials.append(proxies.textured(f"{v['id']}_cap", cap_img, alpha=True))
        return ob, tris, barys

    pony_bone = ctx.BONES.index("pony")

    def assemble(name, braids, capped):
        """One object: braids then cap, every vertex riding the skin under
        it (a ponytail's tail the pony bone)."""
        ob, tris, barys, swing = braids
        c, c_tris, c_barys = capped
        ob = _join(ob, c)
        ob.name = ob.data.name = name
        weights, keys = skin_mix(ctx, np.concatenate([tris, c_tris]), np.concatenate([barys, c_barys]))
        swing = np.concatenate([swing, np.zeros(len(c_tris))])
        weights = weights * (1 - swing[:, None])
        weights[:, pony_bone] += swing
        proxies.attach(ctx, ob, weights, keys)
        return ob

    mat = proxies.textured(f"hair_{v['id']}", strips, alpha=True)
    near_cap = cap(f"{v['id']}_cap", 10, 48)
    cap_tris = sum(len(p.vertices) - 2 for p in near_cap[0].data.polygons)
    # the near model: ridged braids, simplified as little as the triangle
    # budget allows
    for tol in (0.004, 0.005, 0.0065, 0.008, 0.01, 0.013):
        braids = braid_ribbons(ctx, f"Hair_{v['id']}", paths, scalp.centre, ribbon, locks, tol, ridged=True)
        count = sum(len(p.vertices) - 2 for p in braids[0].data.polygons)
        if count + cap_tris <= BUDGET or tol == 0.013:
            break
        bpy.data.objects.remove(braids[0])
    braids[0].data.materials.append(mat)
    near = assemble(f"Hair_{v['id']}", braids, near_cap)
    # the far model, by hand: every other ribbon, wider, flat and coarse, on
    # a coarse cap (the automatic simplify tears braids apart)
    far = braid_ribbons(ctx, f"Hair_{v['id']}@lo", paths[::2], scalp.centre, ribbon * 1.5, locks, 0.012, ridged=False)
    far[0].data.materials.append(mat)
    lo = assemble(f"Hair_{v['id']}@lo", far, cap(f"{v['id']}_cap_lo", 6, 24))
    return [near, lo]


# triangles a near hair model may have (the far ones about a fifth)
BUDGET = 7900


def braid_ribbons(ctx, name, paths, centre, ribbon, locks, tolerance, ridged):
    """Ribbons along braid paths (dicts: pts, under, arc, v0, lock, s0 and
    s1 the stretch of the path, pony the arc length past which it swings,
    scale its width): each simplified to `tolerance` metres, tapered at the
    root (knotless) and the tip, ridged (a crest down the middle, four
    triangles a step) or flat (two), textured with its lock's atlas column.
    Returns the object, each vertex's skin triangle and barycentric weights,
    and how much of it the pony bone carries. `centre` is the head's middle
    (Scalp.centre)."""
    verts, faces, uvs, normals, wts, swing = [], [], [], [], [], []
    across_k = ((-1, 0.0), (0, 0.45), (1, 0.0)) if ridged else ((-1, 0.0), (1, 0.0))
    for path in paths:
        pts, under, arc = path["pts"], path["under"], path["arc"]
        u0, u1 = locks[path["lock"]]["u"]
        w_path = ribbon * path.get("scale", 1.0)
        repeat = w_path * locks[path["lock"]]["aspect"]
        inside = [i for i in range(len(pts)) if path["s0"] <= arc[i] <= path["s1"]]
        if len(inside) < 2:
            continue
        keep = [inside[0] + k for k in simplify(pts[inside[0] : inside[-1] + 1], tolerance)]
        base = len(verts)
        prev_side = prev_out = None
        for i in keep:
            q = pts[i]
            tri, bary, skin_n = under[i]
            # the braid faces out of the hair: away from the skin under it,
            # turned toward the body's axis where it hangs clear, and never
            # along itself (that would twist the ribbon edge-on)
            radial = (q - centre) * np.array([1.0, 1.0, 0.0])
            radial /= max(np.linalg.norm(radial), 1e-6)
            on_head = np.clip((q[2] - (centre[2] - 0.07)) / 0.06, 0, 1)
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
            # knotless: a few hairs at the root, full width within 4.5 cm;
            # the tip narrows over its last 4 cm
            s = arc[i]
            w = w_path * min(1.0, 0.35 + 0.65 * s / 0.045) * (0.55 + 0.45 * min(1.0, (arc[-1] - s) / 0.04))
            # lying on the head a braid flattens and spreads a little, and
            # the rows close up over the parts below them
            w *= 1 + 0.35 * on_head
            pony = 0.0 if path["pony"] is None else float(np.clip((s - path["pony"]) / 0.03, 0, 1))
            # ridged: from the side it still shows a face; the bent normals
            # light either kind like a cord
            for k, (side_k, lift) in enumerate(across_k):
                verts.append(q + across * side_k * w / 2 + face_out * lift * w)
                nn = face_out + across * side_k * 0.9
                normals.append(nn / np.linalg.norm(nn))
                uvs.append((u0 + (u1 - u0) * k / (len(across_k) - 1), path["v0"] + s / repeat))
                wts.append((tri, bary))
                swing.append(pony)
        m = len(across_k)
        for j in range(len(keep) - 1):
            a = base + m * j
            for k in range(m - 1):
                faces.append((a + k, a + k + 1, a + m + k + 1, a + m + k))
    ob = ctx.new_object(name, np.array(verts), faces)
    uv_layer = ob.data.uv_layers.new(name="UVMap").data
    for poly in ob.data.polygons:
        for li in poly.loop_indices:
            uv_layer[li].uv = uvs[ob.data.loops[li].vertex_index]
    for poly in ob.data.polygons:
        poly.use_smooth = True
    ob.data.normals_split_custom_set_from_vertices([tuple(n) for n in normals])
    return ob, np.array([w[0] for w in wts]), np.array([w[1] for w in wts]), np.array(swing)


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


# Fade heights: where the hair reaches full thickness, metres up the scalp
# from the hairline, by azimuth (degrees from the back of the head), and
# over how many metres below that it thins out; `bald` metres at the
# bottom are bare skin. A burst fades round the ear only; a drop dips
# behind the ear toward the nape.
FADE_KINDS = {
    "low": dict(line=((0, 0.04), (180, 0.04)), band=0.04, bald=0.0),
    "mid": dict(line=((0, 0.06), (180, 0.06)), band=0.045, bald=0.008),
    "high": dict(line=((0, 0.085), (180, 0.085)), band=0.05, bald=0.012),
    "skin": dict(line=((0, 0.07), (180, 0.07)), band=0.04, bald=0.018),
    "drop": dict(line=((0, 0.035), (40, 0.04), (75, 0.065), (180, 0.07)), band=0.04, bald=0.01),
    "burst": dict(line=((0, 0.0), (35, 0.0), (60, 0.05), (90, 0.075), (120, 0.05), (140, 0.03), (180, 0.03)), band=0.04, bald=0.006),
}

# Tops: hair length on top (metres), the coil clumps' size (texels of a
# 512 px layer; 0 for straight hair brushed down), and a flat top's height
# above the crown (metres, None for a rounded top). waves: 360 waves, ridges
# rippling out from the crown.
TOPS = {
    "coils": dict(length=0.011, clump=5.0),
    "sponge": dict(length=0.024, clump=9.0),
    "afro": dict(length=0.036, clump=6.0),
    "waves": dict(length=0.006, clump=0.0, waves=0.0085),
    "crop": dict(length=0.009, clump=0.0),
    "hightop": dict(length=0.075, clump=6.0, flat=0.05),
}

# The fade variants: one row each. fade: FADE_KINDS; top: TOPS; part: a
# hard part shaved on the doll's left; design: a shaved line design over
# the left ear.
FADES = [
    dict(id="taper", label="Low taper, short coils", fade="low", top="coils"),
    dict(id="fade-waves", label="Mid fade, 360 waves", fade="mid", top="waves"),
    dict(id="high-top", label="High-top fade", fade="skin", top="hightop"),
    dict(id="burst-sponge", label="Burst fade, sponge curls", fade="burst", top="sponge"),
    dict(id="drop-crop", label="Drop fade, textured crop", fade="drop", top="crop"),
    dict(id="skin-part", label="Skin fade with a hard part", fade="high", top="coils", part=True),
    dict(id="taper-design", label="Low taper with a design", fade="low", top="waves", design=True),
    dict(id="taper-afro", label="Taper, short afro", fade="mid", top="afro"),
]


class Fade:
    """One FADES row on a head: hair density (how much scalp it covers)
    and length over the scalp map, and the lined-up front edge."""

    def __init__(self, scalp, v):
        self.scalp, self.v = scalp, v
        self.kind = FADE_KINDS[v["fade"]]
        self.top = TOPS[v["top"]]
        a, h = zip(*self.kind["line"])
        self.line_at = lambda phi: np.interp(np.degrees(np.abs(phi)), a, h)

    def height(self, t, phi):
        """Metres up from the hairline, along the scalp."""
        return (1 - np.asarray(t)) * self.scalp.metric(np.clip(t, 0, 1), phi)[0]

    def sides(self, phi):
        """1 where the cut fades (temples round to the nape), 0 at the
        forehead's lined-up edge."""
        return np.clip((np.radians(150) - np.abs(phi)) / np.radians(20), 0, 1)

    def density(self, t, phi):
        """How much of the scalp the hair covers (1 = all)."""
        k = self.kind
        line = self.line_at(phi)
        f = np.clip((self.height(t, phi) - line + k["band"] - k["bald"]) / k["band"], 0, 1)
        f = np.where(line <= 0, 1.0, f)
        return 1 - self.sides(phi) * (1 - f * f * (3 - 2 * f))

    def length(self, t, phi):
        """Hair length (metres): the top's, rising out of the fade; shorter
        (brushed down) for the last 1.5 cm to the front edge, so the edge is
        a line on the skin, not the rim of a helmet; a flat top cut level."""
        h = self.height(t, phi)
        top = self.top["length"]
        line = self.line_at(phi)
        if self.top.get("flat") is not None:
            # a high top rises steeply off the fade line into a block
            f = np.clip((h - line + 0.004) / 0.014, 0, 1)
        else:
            f = np.clip((h - line + self.kind["band"] * 0.7) / (self.kind["band"] * 1.4), 0, 1)
        k = f * f * (3 - 2 * f)
        crisp = (1 - self.sides(phi)) * (0.35 + 0.65 * np.clip(h / 0.015, 0, 1))
        return top * np.maximum(np.where(line <= 0, 1.0, k), crisp * (h > 0))

    def flat_cut(self, points, normals, lengths):
        """A flat top: hair pointing up stops at one level above the crown."""
        if self.top.get("flat") is None:
            return lengths
        level = self.scalp.grid[0, 0][2] + self.top["flat"]
        up = np.clip(normals[:, 2], 0.25, 1)
        return np.minimum(lengths, np.maximum(level - points[:, 2], 0) / up)

    def edge(self, t, phi, rng):
        """The lined-up front edge, 0 (skin) to 1 (hair): set back a few
        millimetres from the scalp map's hairline, straighter across the
        forehead, with a sharp corner cut into each temple (a barber's
        line-up) and a slightly irregular, soft run of short hairs along it."""
        a = np.degrees(np.abs(phi))
        h = self.height(t, phi)

        def smooth(x):
            x = np.clip(x, 0, 1)
            return x * x * (3 - 2 * x)

        # straighter across: the middle of the forehead set back, so the
        # line runs level and turns down only at the corners
        back = 0.005 * np.clip((a - 148) / 32, 0, 1) ** 0.7
        # the temple corners: a notch about a centimetre deep with steep
        # sides, so the line turns down at an angle, not round a curve
        back += 0.011 * smooth((a - 133) / 2.5) * smooth((149 - a) / 2.5)
        # the edge wanders a little, hair by hair
        back += 0.0006 * (_noise(np.shape(t), 7, rng) - 0.5) + 0.0003 * (_noise(np.shape(t), 1.5, rng) - 0.5)
        front = 1 - self.sides(phi)
        return 1 - front * (1 - np.clip((h - back) / 0.0012, 0, 1))

    def shaved(self, t, phi):
        """Distance (metres) to the nearest shaved line, a hard part or a
        design (inf without any)."""
        lines = []
        if self.v.get("part"):
            # a hard part on the doll's left, from the front hairline back
            # over the top
            lines.append([(tt, np.radians(146)) for tt in np.linspace(1.0, 0.42, 24)])
        if self.v.get("design"):
            # two sweeping lines over the left ear, in the fade
            for lift, bend in ((0.022, 0.006), (0.034, 0.01)):
                line = []
                for a in np.linspace(55, 125, 30):
                    phi_a = np.radians(a)
                    h = lift + bend * np.sin(np.radians(a - 55) * 2.4)
                    line.append((1 - h / float(self.scalp.metric(0.9, phi_a)[0]), phi_a))
                lines.append(line)
        if not lines:
            return np.full(np.shape(t), np.inf)
        pts = self.scalp.texel_points(t, phi).reshape(-1, 3)
        best = np.full(len(pts), np.inf)
        for line in lines:
            q = np.array([self.scalp.texel_points(np.array(a), np.array(b)) for a, b in line])
            for a, b in zip(q[:-1], q[1:]):
                ab = b - a
                k = np.clip(((pts - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
                best = np.minimum(best, np.linalg.norm(pts - (a + np.outer(k, ab)), axis=1))
        return best.reshape(np.shape(t))


# the layers of a fade, by how far up the hair's length each stands: the
# scalp layer, a solid core (no gaps to see the scalp through) and two fuzz
# shells whose clumps make the hair's outline
LAYERS = (0.0, 0.7, 0.86, 1.0)


def fade_texture(fade, size=1024, seed=21):
    """A fade's atlas: one 512 px disk per layer (scalp, core, two fuzz
    shells) in the corners. Each texel's clump height (cellular noise, or
    ridges for waves, or brushed streaks for straight hair) decides which
    layers it shows on, so clumps narrow toward their tips; the scalp
    layer thins into the fade with stray stubble."""
    rng = np.random.default_rng(seed)
    half = size // 2
    t, phi = fade.scalp.texel_coords(half)
    edge = fade.edge(t, phi, rng)
    shaved = fade.shaved(t, phi)
    dens = fade.density(t, phi) * edge
    top = fade.top
    if top.get("waves"):
        # 360 waves: ridges rippling out from the crown, bending as they go
        crown = t * fade.scalp.metric(np.clip(t, 0, 1), phi)[0]
        swirl = 0.6 * np.sin(phi * 3 + crown * 40)
        ridge = 0.5 + 0.5 * np.sin(2 * np.pi * crown / top["waves"] + swirl)
        clump = 0.25 + 0.6 * ridge + 0.15 * _noise((half, half), 2, rng)
    elif top["clump"]:
        c = top["clump"]
        clump = 0.65 * _cells((half, half), c, rng) + 0.35 * _cells((half, half), c / 2, rng)
    else:
        # straight hair brushed down: streaks round the head
        clump = 0.55 * _noise((half, half), 1.2, rng) + 0.45 * (0.5 + 0.5 * np.sin(phi * 260 + _noise((half, half), 6, rng) * 6))
    stubble = _noise((half, half), 1.0, rng)
    out = np.zeros((size, size, 4), np.float32)
    inside = t <= 1.0
    long = fade.length(t, phi)
    short = 1 - np.clip(long / top["length"], 0, 1)
    # a shaved line: bare skin a millimetre and a half wide, and the hair
    # cleared a little wider so it reads as a groove
    bare = shaved < 0.00075
    groove = shaved < 0.002
    for k, level in enumerate(LAYERS):
        if k == 0:
            # the scalp layer: dense hair (darker in the clumps' shade) in
            # the top, stubble thinning out through the fade and along the
            # front edge (noise is below 1, so full density leaves no hole)
            a = (stubble < dens) & inside & ~bare
            g = 0.5 + 0.25 * clump
        elif k == 1:
            # the core: solid wherever the hair is long enough to stand
            a = (dens > 0.97) & (long > 0.002) & inside & ~groove & (clump > 0.08)
            g = 0.55 + 0.25 * clump
        else:
            # the fuzz: the clumps that reach it, fewer and lighter (their
            # tips catch the light) the further out, thinning into the fade
            a = (clump > 0.1 + 0.42 * level + 0.45 * short) & inside & (edge > 0.5) & ~groove
            g = 0.62 + 0.3 * level + 0.12 * (clump - 0.5)
        y0, x0 = (k // 2) * half, (k % 2) * half
        out[y0 : y0 + half, x0 : x0 + half] = np.dstack([g, g, g, a.astype(np.float32)])
    return np.clip(out, 0, 1)


def fade_style(ctx, v):
    """One FADES variant (a row `v`): the near model (the scalp layer, the
    core and the fuzz shells, each only where the hair is long enough to
    need it) and the hand-made far one (scalp, core and outer fuzz on a
    coarse grid), Hair_<id> and Hair_<id>@lo, sharing one atlas."""
    scalp = Scalp(ctx)
    fade = Fade(scalp, v)
    img = image(v["id"], fade_texture(fade))
    mat = proxies.textured(f"hair_{v['id']}", img, alpha=True)
    flat = fade.top.get("flat") is not None

    def model(name, layers, rings, segments):
        made = []
        for k in layers:
            level = LAYERS[k]
            y0, x0 = (k // 2) * 0.5, (k % 2) * 0.5

            def lift(t, phi, level=level):
                # (2 mm: a coarse cap face never dips under the skull's curve)
                return 0.0018 + float(fade.length(t, phi)) * level

            keep = None if k == 0 else (lambda t, phi: fade.length(t, phi) > 0.002)
            ob, tris, barys = scalp.cap(f"{name}_{k}", rings, segments, lift, atlas=(x0, y0, 0.5), keep=keep)
            if flat and k:
                # cut the block level on top: each vertex comes down its own
                # normal to the flat
                co = np.array([v_.co[:] for v_ in ob.data.vertices])
                base = np.einsum("nk,nkd->nd", barys, ctx.PB[tris])
                nrm = co - base
                L = np.linalg.norm(nrm, axis=1)
                nrm /= np.maximum(L, 1e-9)[:, None]
                cut = fade.flat_cut(base, nrm, (L - 0.0018) / level) * level + 0.0018
                ob.data.vertices.foreach_set("co", (base + nrm * cut[:, None]).ravel())
            ob.data.materials.append(mat)
            # inner layers sit in the hair's own shade
            ob["layer_shade"] = [0.7 + 0.3 * level] * len(ob.data.vertices)
            made.append((ob, tris, barys))
        ob = made[0][0]
        shade = list(ob["layer_shade"])
        for other, _, _ in made[1:]:
            shade += list(other["layer_shade"])
            ob = _join(ob, other)
        ob.name = ob.data.name = name
        ob["layer_shade"] = shade
        weights, keys = skin_mix(ctx, np.concatenate([x[1] for x in made]), np.concatenate([x[2] for x in made]))
        proxies.attach(ctx, ob, weights, keys)
        return ob

    rings = 18 if flat else 12
    near = model(f"Hair_{v['id']}", range(len(LAYERS)), rings, 64)
    lo = model(f"Hair_{v['id']}@lo", (0, 1, 3), 8, 32)
    return [near, lo]


def style(ctx, style_id):
    """The near and far models of one BRAIDS or FADES row, by its id."""
    for v in BRAIDS:
        if v["id"] == style_id:
            return braid_style(ctx, v)
    for v in FADES:
        if v["id"] == style_id:
            return fade_style(ctx, v)
    raise KeyError(style_id)


STYLE_IDS = [v["id"] for v in BRAIDS + FADES]


def build(ctx):
    """Every built style, near and far, for doll_hair.build."""
    return [ob for style_id in STYLE_IDS for ob in style(ctx, style_id)]

