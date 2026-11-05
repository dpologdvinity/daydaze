"""Hair styles, all built here: strand cards over a scalp cap, plus sculpted
buns, afro and braids.

Each style is one object named Hair_<id> (ids match HAIR_STYLES in
src/game/look.ts). Textures become grey strand maps the client tints.
"""

import os

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Vector
from mathutils.kdtree import KDTree

import proxies
import strands

# style id -> MakeHuman proxy: the short cuts, where strand cards that short
# read as scraps; MakeHuman's own short-hair meshes hold their shape
PROXY = {
    "crop": "hair/short02/short02.mhclo",
    "swept": "hair/short04/short04.mhclo",
    "textured": "hair/short01/short01.mhclo",
    "fringe": "hair/short03/short03.mhclo",
}
TEXTURE = {k: v.replace(".mhclo", "_diffuse.png") for k, v in PROXY.items()}


def swing(ctx, ob, start):
    """Moves weight from the head to the pony bone for strands hanging
    behind and below `start` (Blender space), so tails sway."""
    pony = ob.vertex_groups["pony"]
    head = ob.vertex_groups[ctx.HEAD]
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
    faces = []
    for f in ctx.FACES["body"]:
        pts = ctx.PB[f]
        if ctx.HEADW[f].min() < 0.98:
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


UBC = "/tmp/ubc/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/"


def _ubc_mesh(ctx, gltf):
    """Vertices (world space) and faces of a pack hairstyle's mesh."""
    ctx.existing = {o.name for o in bpy.context.scene.objects}
    bpy.ops.import_scene.gltf(filepath=UBC + gltf)
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.name.startswith("Hair_"))
    co = np.array([(src.matrix_world @ v.co)[:] for v in src.data.vertices])
    faces = [list(p.vertices) for p in src.data.polygons]
    # the pack's helper empties and icosphere come along: drop them all
    for o in list(bpy.context.scene.objects):
        if o.name not in ctx.existing:
            bpy.data.objects.remove(o)
    return co, faces


def ubc_hair(ctx, name, gltf, mat, grow=0.012, keep=None, lift=None):
    """A Quaternius (CC0) hairstyle refitted to our head: the pack's buzz cut
    (the same sex's) is mapped onto the head's bounding box (brow up, grown a
    little) and every style takes that same map, so a taller cut keeps its
    height. Each vertex then rides its nearest head-skin vertex for bones and
    shape keys."""
    female = os.environ.get("DOLL_SEX", "female") == "female"
    ref, _ = _ubc_mesh(ctx, "Hair_BuzzedFemale.gltf" if female else "Hair_Buzzed.gltf")
    co, faces = _ubc_mesh(ctx, gltf)
    hlo, hhi = ref.min(axis=0), ref.max(axis=0)
    head = np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.98])
    head = np.unique(head)
    pts = ctx.PB[head]
    pts = pts[pts[:, 2] > ctx.JB["lEye"][2] - 0.02]
    lo, hi = pts.min(axis=0) - grow, pts.max(axis=0) + grow
    co = lo + (co - hlo) / (hhi - hlo) * (hi - lo)
    if lift is not None:
        # `lift(z, top)` pushes each vertex out from the head's center by that
        # many metres: volume on top, tight at the sides
        c = (lo + hi) / 2
        d = co - c
        d /= np.linalg.norm(d, axis=1, keepdims=True)
        co = co + d * np.array([lift(p[2], hi[2]) for p in co])[:, None]
    if keep is not None:
        # `keep(centroid, top)` drops faces, e.g. the sides, for shaved cuts
        faces = [f for f in faces if keep(co[f].mean(axis=0), hi[2])]
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        co = co[used]
        faces = [[remap[i] for i in f] for f in faces]
    ob = ctx.new_object(name, co, faces)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    skin = np.unique(np.array([i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.5]))
    tree = KDTree(len(skin))
    for i, p in enumerate(ctx.PB[skin]):
        tree.insert(p, i)
    tree.balance()
    near = skin[[tree.find(p)[1] for p in co]]
    proxies.attach(ctx, ob, ctx.W[near], {k: d[near] for k, d in ctx.KEYS.items()})
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


def plaits(
    ctx,
    mat,
    name,
    count=48,
    length=0.5,
    radius=0.0075,
    pulse=0.35,
    cycles=16,
    rows=2,
    jitter=0.0,
    sides=5,
    seed=1,
):
    """Hanging tubes from rows round the back and sides of the hairline, falling
    behind the shoulders. `pulse` and `cycles` make the tube's radius swell
    like a weave; `jitter` varies each tube's length and thickness (locs)."""
    head = ctx.JB["head"]
    eye_z = ctx.JB["lEye"][2]
    shoulder_z = ctx.JB["lArm"][2]
    rng = np.random.default_rng(seed)
    row_z = [0.085, 0.035, -0.015, -0.06][:rows]

    def extra(bm, ctx):
        scalp = [v.co.copy() for v in bm.verts]
        per_row = count // rows
        for k in range(count):
            row = k % rows
            a = np.radians(-150 + 300 * (k // rows) / (per_row - 1))
            # angle 0 is the back of the head (+y), +-150 the temples
            d = np.array([np.sin(a), np.cos(a)])
            z = eye_z + row_z[row]
            probe = Vector((head[0] + d[0] * 0.2, head[1] + d[1] * 0.2, z))
            start = min(scalp, key=lambda c: (c - probe).length)
            reach = length * (1 + jitter * (rng.random() - 0.5) * 1.2)
            thick = radius * (1 + jitter * (rng.random() - 0.3))
            phase = rng.random() * 6.28
            prev = None
            steps = 26
            for i in range(steps):
                t = i / (steps - 1)
                zz = start.z - t * reach
                # out from the scalp, then behind the shoulders below the neck
                out = 0.012 + (0.05 * min(1, (start.z - zz) / 0.12))
                xy = np.array([start.x, start.y]) + np.append(d, 0)[:2] * out
                if zz < shoulder_z + 0.05:
                    xy[1] = max(xy[1], head[1] + 0.07 + 0.05 * (shoulder_z + 0.05 - zz))
                    xy[0] *= 0.85
                r = thick * (1 + pulse * abs(np.sin(t * np.pi * cycles + phase))) * min(1.0, 0.55 + t * 6)
                c = Vector((xy[0], xy[1], zz))
                ring = []
                for j in range(sides):
                    th = 2 * np.pi * j / sides
                    ring.append(bm.verts.new(c + Vector((np.cos(th) * r, np.sin(th) * r, 0))))
                if prev:
                    for j in range(sides):
                        bm.faces.new((prev[j], prev[(j + 1) % sides], ring[(j + 1) % sides], ring[j]))
                prev = ring
            # a rounded tip, so no tube is left open
            bm.faces.new(prev)

    return scalp_hair(ctx, name, mat, extra)


def braids(ctx, mat, count=48, length=0.5):
    """Knotless braids: plaits from two rows round the back and sides."""
    return plaits(ctx, mat, "Hair_braids", count=count, length=length)


def box_braids(ctx, mat):
    """Box braids: thicker, longer plaits in three rows, a heavier weave."""
    return plaits(
        ctx, mat, "Hair_box-braids", count=100, length=0.66, radius=0.0058, pulse=0.55, cycles=26, rows=4, seed=3
    )


def locs(ctx, mat):
    """Locs: thick ropes of uneven length and thickness, a soft irregular
    swell rather than a weave."""
    return plaits(
        ctx,
        mat,
        "Hair_locs",
        count=120,
        length=0.42,
        radius=0.0062,
        pulse=0.12,
        cycles=4,
        rows=4,
        jitter=0.9,
        sides=6,
        seed=5,
    )


def _surface_z(scalp, x, y, window=0.014):
    """Height of the scalp shell at (x, y): the highest vertex nearby."""
    zs = [c.z for c in scalp if abs(c.x - x) < window and abs(c.y - y) < window]
    if not zs:
        zs = [c.z for c in scalp if abs(c.x - x) < 2 * window and abs(c.y - y) < 2 * window]
    return max(zs) if zs else None


def cornrows(ctx, mat, rows=11):
    """Cornrows: raised ridges combed from the front hairline to the crown's
    back, converging toward the nape, then dropping as short plaits."""
    head = ctx.JB["head"]
    eye_z = ctx.JB["lEye"][2]

    def extra(bm, ctx):
        scalp = [v.co.copy() for v in bm.verts]
        steps = 40
        for k in range(rows):
            side = -1 + 2 * k / (rows - 1)
            ts = [i / (steps - 1) for i in range(steps)]
            xs = [head[0] + side * 0.075 * (1 - 0.55 * t**1.5) for t in ts]
            ys = [head[1] - 0.085 + t * 0.19 for t in ts]
            zs = [_surface_z(scalp, x, y, 0.02) for x, y in zip(xs, ys)]
            # fill gaps, then smooth: the shell's vertex spacing would make the
            # ridge climb in steps
            known = [z for z in zs if z is not None]
            if not known:
                continue
            zs = [z if z is not None else known[-1] for z in zs]
            for _ in range(6):
                zs = [zs[0]] + [(zs[i - 1] + 2 * zs[i] + zs[i + 1]) / 4 for i in range(1, steps - 1)] + [zs[-1]]
            prev = None
            for t, x, y, z in zip(ts, xs, ys, zs):
                # past the crown the row leaves the scalp and hangs as a plait
                drop = max(0.0, t - 0.8) / 0.2
                zz = z + 0.003 - drop * 0.16
                yy = y + drop * 0.02
                r = 0.0085 * (1 + 0.2 * abs(np.sin(t * np.pi * 22)))
                c = Vector((x * (1 - 0.1 * drop), yy, zz))
                ring = [
                    bm.verts.new(c + Vector((np.cos(th) * r, np.sin(th) * r, 0)))
                    for th in (2 * np.pi * j / 5 for j in range(5))
                ]
                if prev:
                    for j in range(5):
                        bm.faces.new((prev[j], prev[(j + 1) % 5], ring[(j + 1) % 5], ring[j]))
                prev = ring

    return scalp_hair(ctx, "Hair_cornrows", mat, extra)


def bantu_knots(ctx, mat):
    """Bantu knots: sixteen small twisted knots over the head."""
    head = ctx.JB["head"]

    def extra(bm, ctx):
        scalp = [v.co.copy() for v in bm.verts]
        spots = [(0.0, 0.0)]
        for ring_r, n, off in ((0.045, 6, 0.0), (0.085, 9, 0.35)):
            for i in range(n):
                a = 2 * np.pi * i / n + off
                # keep the front free so the face stays framed
                spots.append((ring_r * np.sin(a), ring_r * np.cos(a) * 1.05 + 0.01))
        for dx, dy in spots:
            x, y = head[0] + dx, head[1] + dy
            z = _surface_z(scalp, x, y)
            if z is None:
                continue
            ret = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=0.021)
            for v in ret["verts"]:
                d = v.co.normalized()
                ang = np.arctan2(d.y, d.x)
                v.co *= 1 + 0.12 * np.sin(ang * 3 + d.z * 9)
                v.co.z *= 1.15
                v.co += Vector((x, y, z + 0.012))

    return scalp_hair(ctx, "Hair_bantu-knots", mat, extra)


def puffs(ctx, mat):
    """Two high puffs, one each side of a centre part: fine-curled clouds."""
    head = ctx.JB["head"]

    def extra(bm, ctx):
        top = _top(bm)
        for side in (1, -1):
            c = Vector((head[0] + side * 0.066, head[1] + 0.02, top - 0.008))
            ret = bmesh.ops.create_uvsphere(bm, u_segments=36, v_segments=24, radius=1)
            for v in ret["verts"]:
                d = v.co.copy()
                bump = 1 + 0.06 * np.sin(d.x * 53 + d.z * 17) * np.sin(d.y * 47 + d.z * 31)
                v.co = Vector((d.x * 0.066, d.y * 0.064, d.z * 0.06)) * bump + c

    return scalp_hair(ctx, "Hair_puffs", mat, extra)


def _surface(bm, zs, n, point, skip=None):
    """Grid surface of rings over heights `zs` with `n` samples round each:
    `point(z, a)` gives a vertex for the angle a (0 = the back, pi = the
    front); `skip(z, a)` returns None, or the angle of the opening's rim when
    the vertex falls inside the opening, which cuts the faces inside it. Rings wrap, so the surface is a closed sleeve."""
    grid = []
    cut = []
    for z in zs:
        row, gone = [], []
        for j in range(n):
            a = 2 * np.pi * j / n
            edge = skip(z, a) if skip else None
            # a vertex inside the opening slides sideways onto its rim, so
            # the cut edge is smooth instead of stepping ring by ring
            row.append(bm.verts.new(point(z, edge if edge is not None else a)))
            gone.append(edge is not None)
        grid.append(row)
        cut.append(gone)
    for r in range(len(zs) - 1):
        for j in range(n):
            k = (j + 1) % n
            if cut[r][j] and cut[r][k] and cut[r + 1][k] and cut[r + 1][j]:
                continue
            bm.faces.new((grid[r][j], grid[r][k], grid[r + 1][k], grid[r + 1][j]))


def _head_box(bm, ctx):
    """Centre and half-extents (x, y) of the scalp shell, and its top."""
    eye_z = ctx.JB["lEye"][2]
    pts = [v.co for v in bm.verts if v.co.z > eye_z]
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    return (
        (max(xs) + min(xs)) / 2,
        (max(ys) + min(ys)) / 2,
        (max(xs) - min(xs)) / 2,
        (max(ys) - min(ys)) / 2,
        max(p.z for p in pts),
    )


HIJAB_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "hijab-sketchfab.glb")
# the scan's mannequin head: width and top height, its y centre, in its own units
HIJAB_HEAD = dict(width=1.75, top=1.93, cy=0.1)


def hijab(ctx, mat):
    """A hijab: the draped scarf of Sketchfab's "Hijab" (CC-BY, see
    docs/assets.md) with its mannequin cut out, scaled to the doll's head,
    pushed clear of the body and skinned from the nearest body vertices, so
    it frames the face, covers hair and neck and falls over the shoulders."""
    import bmesh as bm_

    eye_z = ctx.JB["lEye"][2]
    head = [i for i in range(len(ctx.PB)) if ctx.HEADW[i] >= 0.98 and ctx.PB[i][2] > eye_z]
    hp = ctx.PB[head]
    cx, cy = (hp[:, 0].max() + hp[:, 0].min()) / 2, (hp[:, 1].max() + hp[:, 1].min()) / 2
    scale = (hp[:, 0].max() - hp[:, 0].min()) * 1.16 / HIJAB_HEAD["width"]
    top = hp[:, 2].max()

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=HIJAB_SRC)
    src = next(o for o in bpy.data.objects if o not in before and o.type == "MESH")
    bm = bm_.new()
    bm.from_mesh(src.data)
    uv = bm.loops.layers.uv.active
    # the texture's top-left corner paints the mannequin's skin: those faces go
    bm_.ops.delete(
        bm,
        geom=[f for f in bm.faces if all(l[uv].uv.x < 0.21 and l[uv].uv.y > 0.8 for l in f.loops)],
        context="FACES",
    )
    bm_.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # the scan splits vertices along UV seams; welded, it smooths across them
    bm_.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    world = src.matrix_world.copy()
    verts = np.array([(world @ v.co)[:] for v in bm.verts])
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    for o in [o for o in bpy.data.objects if o not in before]:
        bpy.data.objects.remove(o)

    verts = np.array(verts)
    verts[:, 0] = cx + verts[:, 0] * scale
    verts[:, 1] = cy - 0.012 + (verts[:, 1] - HIJAB_HEAD["cy"]) * scale
    verts[:, 2] = top + 0.006 + (verts[:, 2] - HIJAB_HEAD["top"]) * scale

    # nearest body vertex: its weights, and a push out along its normal so no
    # fold sinks into the skin or the shoulders
    nrm = np.zeros_like(ctx.PB)
    for f in ctx.FACES["body"]:
        pts = ctx.PB[f]
        n = np.cross(pts[1] - pts[0], pts[2] - pts[0])
        nrm[list(f)] += n
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    tree = KDTree(len(ctx.PB))
    for i, p in enumerate(ctx.PB):
        tree.insert(p, i)
    tree.balance()
    near = np.array([tree.find(v)[1] for v in verts], int)
    for i, (v, n) in enumerate(zip(verts, near)):
        out = float(np.dot(v - ctx.PB[n], nrm[n]))
        if out < 0.007:
            verts[i] = v + nrm[n] * (0.007 - out)

    ob = ctx.new_object("Hair_hijab", verts, faces)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    proxies.attach(ctx, ob, ctx.W[near], {k: d[near] for k, d in ctx.KEYS.items()})
    return ob


def _cloth_dome(ctx, bm, top, rise, grow, fold_fn, n, rows):
    """A dome of cloth from the brow round the skull, lower at the back where
    the hairline is, closing at the crown `rise` above the scalp. `grow` is how
    far it stands off the head; `fold_fn(t, a)` adds the cloth's ridges."""
    cx, cy, rx, ry, _ = _head_box(bm, ctx)
    eye_z = ctx.JB["lEye"][2]
    crown = top + rise

    def base(a):
        # the front edge sits at the brow, the back reaches the nape
        return eye_z + 0.012 - 0.05 * (1 + np.cos(a)) / 2

    zs = list(np.linspace(crown, eye_z - 0.04, rows))

    def point(z, a):
        z = max(z, base(a))
        t = np.clip((z - base(a)) / (crown - base(a)), 0, 1)
        k = np.sqrt(max(0.0, 1 - t**2))
        # a head narrows toward the nape
        taper = 1 - 2.2 * max(0.0, eye_z - z)
        w = ((rx + grow + fold_fn(t, a)) * k + 0.003) * taper
        d = ((ry + grow + fold_fn(t, a)) * k + 0.003) * taper
        return Vector((cx + np.sin(a) * w, cy + np.cos(a) * d, z))

    _surface(bm, zs, n, point)
    return cx, cy, rx, ry


def head_wrap(ctx, mat):
    """A head wrap: a snug dome of cloth, two wound bands and a knot at the
    front, the way a scarf is tied."""

    def extra(bm, ctx):
        top = _head_box(bm, ctx)[4]
        eye_z = ctx.JB["lEye"][2]

        def fold(t, a):
            # the cloth swells where it is wound over itself
            return 0.005 * (np.exp(-(((t - 0.18) / 0.07) ** 2)) + np.exp(-(((t - 0.5) / 0.07) ** 2)))

        cx, cy, rx, ry = _cloth_dome(ctx, bm, top, 0.012, 0.012, fold, 72, 44)
        # the knot: two flat lobes and a squashed centre twist, tied at the
        # front of the crown
        at = Vector((cx, cy - ry * 0.7, top - 0.022))
        for side in (1, -1):
            ret = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
            for v in ret["verts"]:
                d = v.co.copy()
                v.co = Vector((d.x * 0.042, d.y * 0.02, d.z * 0.024))
                v.co.rotate(Euler((0, side * 0.55, 0)))
                v.co += at + Vector((side * 0.05, -0.008, 0.006))
        ret = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1)
        for v in ret["verts"]:
            v.co = Vector((v.co.x * 0.016, v.co.y * 0.014, v.co.z * 0.02)) + at + Vector((0, -0.012, 0.004))

    return scalp_hair(ctx, "Hair_head-wrap", mat, extra)


def turban(ctx, mat):
    """A turban: a tall wound dome, ridged folds climbing round it."""

    def extra(bm, ctx):
        top = _head_box(bm, ctx)[4]

        def fold(t, a):
            # twisted cloth: sharp ridges spiralling up the dome
            return 0.014 * np.abs(np.sin(a * 3 + t * 11)) ** 0.7 * (0.3 + t)

        _cloth_dome(ctx, bm, top, 0.05, 0.022, fold, 96, 64)

    return scalp_hair(ctx, "Hair_turban", mat, extra)


def shade_strands(ctx, ob):
    """Root-to-tip shading as vertex colours: hair near the scalp sits in its
    own shadow and reads darker and denser; lengths and tips catch the light.
    The client multiplies these into the hair colour."""
    scalp = ctx.PB[[i for f in ctx.FACES["body"] for i in f if ctx.HEADW[i] > 0.98]]
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
    import doll_outfits

    out = []
    only = [n for n in os.environ.get("HAIR_ONLY", "").split(",") if n]
    if only:
        # HAIR_ONLY=hijab,turban builds just those sculpted parts (fast)
        solid = bpy.data.materials.new("hair_solid")
        make = {"hijab": hijab, "head-wrap": head_wrap, "turban": turban}
        return [make[n](ctx, solid) for n in only]
    for style, path in PROXY.items():
        img = proxies.detail_texture(TEXTURE[style], 1024)
        mat = proxies.textured(f"hair_{style}", img, alpha=True)
        ob = proxies.build(ctx, f"Hair_{style}", path, mat)
        if style == "ponytail":
            swing(ctx, ob, ctx.JB["head"] + np.array([0, 0.06, 0.02]))
        out.append(ob)
    solid = bpy.data.materials.new("hair_solid")
    out += [buns(ctx, solid), afro(ctx, solid), braids(ctx, solid), top_knot(ctx, solid)]
    out += [
        box_braids(ctx, solid),
        locs(ctx, solid),
        cornrows(ctx, solid),
        bantu_knots(ctx, solid),
        puffs(ctx, solid),
    ]
    out += [hijab(ctx, solid), head_wrap(ctx, solid), turban(ctx, solid)]
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
        # a defined twist-out: loose spirals with lift, to the shoulder
        "twist-out": dict(length=0.3, count=480, curl=0.03, wave=0.02, volume=2.2),
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
    # close-cropped styles. bald has no model (the client wears none).
    # buzz: the combed cap alone, a few millimetres of fuzz
    buzz = ubc_hair(ctx, "Hair_buzz", "Hair_BuzzedFemale.gltf" if os.environ.get("DOLL_SEX", "female") == "female" else "Hair_Buzzed.gltf", solid)
    out.append(buzz)
    # shaved sides: the parted cut, lifted into volume on top and left tight
    # at the sides and back
    def top_volume(z, t):
        k = np.clip((z - (t - 0.075)) / 0.05, 0, 1)
        return 0.018 * k * k * (3 - 2 * k)

    def tapered(volume):
        """The fade: the cut hugs the scalp at its hem (roots read dark, so
        it shades into skin) and swells only toward the crown."""

        def lift(z, t):
            k = np.clip((z - (t - 0.14)) / 0.06, 0, 1)
            return volume(z, t) - 0.011 * (1 - k * k * (3 - 2 * k))

        return lift

    # above the ears the sides are clipped away: bare skin, then the fade
    def undercut(c, t):
        return c[2] > t - 0.1 or abs(c[0]) < 0.045

    shaved = ubc_hair(
        ctx, "Hair_shaved-sides", "Hair_SimpleParted.gltf", solid,
        lift=tapered(top_volume), keep=undercut,
    )
    out.append(shaved)
    # edges: the sleek parted cut, hugging the scalp and faded at the nape
    sleek = ubc_hair(
        ctx, "Hair_sleek", "Hair_SimpleParted.gltf", solid, grow=0.016,
        lift=tapered(lambda z, t: 0.0),
    )
    edges = sleek
    edges.name = "Hair_edges"
    out.append(edges)
    for ob in out:
        shade_strands(ctx, ob)
    return out
