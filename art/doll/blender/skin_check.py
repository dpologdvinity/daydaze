"""Dev-only: counts body vertices that poke through a garment in a baked clip.

    blender --background --factory-startup --python art/doll/blender/skin_check.py -- \
        Outfit_suit [sex=male] [pack=social] [clips=idle,walk] [frames=6] [zmin=1.15] [zmax=1.45] [all=1] [faces=1] [lod=1] [pixels=1 pixels_z=0.5]

Imports the raw build (.cache/out), wears the garment (its tuck key at 1) and,
for frames spread over each clip, reports the body vertices the tuck sank that
are newly without cloth ahead of them along their normal (skin showing through). `clips` are action
name prefixes; with none given, every clip in the pack is checked.
"""

import os
import sys

import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("DOLL_DIR") or os.path.join(HERE, ".cache", "out")  # DOLL_DIR=public/models/doll: the shipped parts
args = sys.argv[sys.argv.index("--") + 1 :]
part = args[0]
opts = dict(a.split("=") for a in args[1:])
sfx = "-m" if opts.get("sex") == "male" else ""
# lod=1 checks the far-LOD twins (body-lo and <garment>-lo): they only exist
# optimized, so point DOLL_DIR at public/models/doll and ANIM_DIR at the raw clips
lo = "-lo" if opts.get("lod") == "1" else ""
ANIMS = os.environ.get("ANIM_DIR") or OUT
count = int(opts.get("frames", 6))
pack = f"-{opts['pack']}" if opts.get("pack") else ""
faces_too = opts.get("faces") == "1"  # also probe each covered triangle's middle
dump = opts.get("dump") == '1'  # list each poking vertex (rest, posed)
wanted = [c for c in opts.get("clips", "").split(",") if c]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"body{sfx}{lo}.glb"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys and "tuck_" + part.split("_", 1)[1] in o.data.shape_keys.key_blocks)
kind, name = part.split("_", 1)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"{kind.lower()}-{name}{sfx}{lo}.glb"))
garment = None
for o in set(bpy.data.objects) - before:
    if o.type == "MESH" and o.name == part:  # not the importer's bone-shape icosphere
        for m in o.modifiers:
            if m.type == "ARMATURE":
                m.object = rig
        o.parent = rig
        garment = o
    elif o.type == "ARMATURE":
        bpy.data.objects.remove(o)
for ob in (body, garment):
    if ob.data.shape_keys:
        for kb in ob.data.shape_keys.key_blocks:
            kb.value = 1.0 if kb.name == f"tuck_{name}" else 0.0
before = set(bpy.data.objects)
# the raw bake (mocap.py; `pack=test` is its `-- id id` run) has the clips on
# an armature's bones; the shipped optimized ones animate bare nodes
bpy.ops.import_scene.gltf(filepath=os.path.join(ANIMS, f"anims{pack}{sfx}.glb"))
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
rig.animation_data_create()

# the vertices this garment's tuck sank: the skin it covers
keys = body.data.shape_keys.key_blocks
n = len(body.data.vertices)
base, tuck = np.empty(n * 3), np.empty(n * 3)
keys["Basis"].data.foreach_get("co", base)
keys[f"tuck_{name}"].data.foreach_get("co", tuck)
covered = np.where(np.abs(tuck - base).reshape(-1, 3).sum(1) > 1e-6)[0]
if opts.get("all") == "1":
    # every body vertex, not just the ones the tuck sank: cloth the tuck left
    # alone (a shell well clear of the skin) can still fold away from it
    covered = np.arange(n)
# zmin=1.15 looks only at the torso above the waist (metres, Blender space)
zmin = float(opts.get("zmin", -9))
zmax = float(opts.get("zmax", 9))  # 1.45 leaves out the neck, which shows above a collar
rest_z = base.reshape(-1, 3)[covered][:, 2]
covered = covered[(rest_z > zmin) & (rest_z < zmax)]
print(f"{part}: {len(covered)} of {n} body vertices covered")

rest = base.reshape(-1, 3)  # bind pose, untucked
covered_set = set(int(v) for v in covered)
sc = bpy.context.scene


def poking():
    """Covered vertices with no cloth ahead of them along their own normal
    in the current pose, each with its distance outside the cloth."""
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(garment, dg)
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    out = {}
    for v in covered:
        # local space: a clip may move the rig object itself, and the cloth's BVH is local too
        p = me.vertices[v].co
        if bvh.ray_cast(p, me.vertex_normals[v].vector, 0.08)[0] is None:
            loc, nor, _f, _d = bvh.find_nearest(p, 0.2)
            out[int(v)] = (p - loc).dot(nor) if loc is not None else 0.0
            if dump:
                print("POKE", int(v), [round(float(c), 3) for c in rest[v]], "posed", [round(c, 3) for c in p], "sunk mm", round(float(np.linalg.norm((tuck - base).reshape(-1, 3)[v])) * 1000, 1))
    if faces_too:
        # a flat cloth triangle can cut a chord through a creased skin triangle
        # (the back of a bent knee) with every vertex of both still in order
        for poly in me.polygons:
            if not all(int(v) in covered_set for v in poly.vertices):
                continue
            if bvh.ray_cast(poly.center, poly.normal, 0.08)[0] is None:
                loc, nor, _f, _d = bvh.find_nearest(poly.center, 0.2)
                out[n + poly.index] = (poly.center - loc).dot(nor) if loc is not None else 0.0
    ev.to_mesh_clear()
    return out


def probe_z(key):
    """Bind-pose height of a probe: a vertex, or a triangle (key >= n)."""
    if key < n:
        return rest[key][2]
    return rest[list(body.data.polygons[key - n].vertices)][:, 2].mean()




def setup_render():
    """Workbench, skin red over blue cloth, only the body and the garment."""
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "OBJECT"
    body.color, garment.color = (0.9, 0.2, 0.2, 1), (0.2, 0.4, 0.9, 1)
    for o in (body, garment):
        o.hide_render = False
    for o in bpy.data.objects:
        if o.type == "MESH" and o not in (body, garment):
            o.hide_render = True


def seen(height):
    """Skin pixels showing in the current pose, summed over five views of the
    legs (behind, behind each side, each side) in a 360 px orthographic frame
    one metre across, centered `height` metres up. Only the legs' band is
    judged (a quarter to three quarters of a metre either side of `height`), so shoes, a swinging hand and the hip do not count."""
    from mathutils import Vector

    setup_render()
    cam = bpy.data.objects.get("pixcam") or bpy.data.objects.new("pixcam", bpy.data.cameras.new("pixcam"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 1.0
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = 360
    sc.render.film_transparent = True
    total = 0
    for dx, dy in ((0, 1), (0.7, 0.7), (-0.7, 0.7), (1, 0), (-1, 0)):
        cam.location = (dx * 3, dy * 3, height)
        cam.rotation_euler = Vector((-dx, -dy, 0)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(bpy.app.tempdir, "seen.png")
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(sc.render.filepath, check_existing=False)
        # rows 90 to 270 of 360, bottom up: 0.25 to 0.75 m about the center
        px = np.array(img.pixels[:]).reshape(360, 360, 4)[90:270].reshape(-1, 4)
        bpy.data.images.remove(img)
        # skin is red over blue cloth; the studio light shades both, so compare channels
        total += int(((px[:, 3] > 0.5) & (px[:, 0] > px[:, 2] * 1.6) & (px[:, 0] > 0.15)).sum())
    return total


# skin the cloth never covers in the bind pose (a neck above a collar, an
# armpit) isn't a pose's fault: only what a clip newly uncovers counts
sc.frame_set(1)
bind = set(poking())
print(f"  bind pose: {len(bind)} vertices with no cloth over them")
worst_depth = {}
shown = {}
for act in sorted(bpy.data.actions, key=lambda a: a.name):
    if wanted and not any(act.name.startswith(w) for w in wanted):
        continue
    rig.animation_data.action = act
    if act.slots:
        rig.animation_data.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    worst, worst_at, where = 0, 0, {}
    for i in range(count):
        sc.frame_set(int(f0 + (f1 - f0) * i / count))
        new = {v: d for v, d in poking().items() if v not in bind}
        for v, d in new.items():
            where[int(probe_z(v) * 10)] = where.get(int(probe_z(v) * 10), 0) + 1
            worst_depth[v] = max(worst_depth.get(v, 0.0), d)
        if len(new) > worst:
            worst, worst_at = len(new), i
        if opts.get("pixels") == "1":
            px = seen(float(opts.get("pixels_z", 0.5)))
            # the pixels at the first frame stand for the bare skin of the pose
            shown[act.name] = max(shown.get(act.name, 0), px)
    print(f"  {act.name}: worst {worst} newly poking (frame {worst_at}/{count}), by height {dict(sorted(where.items()))}" + (f", skin pixels seen {shown[act.name]}" if shown else ""))

def shoot(path, aim, eye):
    """Workbench render, skin red over blue cloth, of the current frame."""
    setup_render()
    cam = bpy.data.objects.get("shotcam") or bpy.data.objects.new("shotcam", bpy.data.cameras.new("shotcam"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    cam.location = eye
    d = np.array(aim) - np.array(eye)
    cam.rotation_euler = __import__("mathutils").Vector(d).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 70
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = 700
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


if opts.get("shot"):
    # shot=<dir> shot_at=<clip>:<frame index>: renders the pose from behind
    # (and from the side) around the knee, to look at what the numbers say
    clip, idx = opts.get("shot_at", "walk-normal:5").split(":")
    act = next(a for a in bpy.data.actions if a.name == clip)
    rig.animation_data.action = act
    if act.slots:
        rig.animation_data.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    sc.frame_set(int(f0 + (f1 - f0) * int(idx) / count))
    h = float(opts.get("shot_z", 0.45))
    for tag, eye in (
        ("back", (0.0, 1.0, h)),
        ("backleft", (0.7, 0.7, h)),
        ("backright", (-0.7, 0.7, h)),
        ("side", (1.0, 0.0, h)),
    ):
        shoot(os.path.join(opts["shot"], f"{part}-{clip}-{idx}-{tag}.png"), (0.0, 0.0, h), eye)

if shown:
    print(f"SKIN PIXELS worst over clips {max(shown.values())}, mean of clips {sum(shown.values()) / len(shown):.0f}")
depths = np.array(list(worst_depth.values()))
print(
    f"{len(depths)} vertices poke in some pose; distance outside the cloth (mm) "
    f"p50 {np.percentile(depths, 50) * 1000:.1f} max {depths.max() * 1000:.1f}"
    if len(depths)
    else "no vertex pokes in any pose"
)
