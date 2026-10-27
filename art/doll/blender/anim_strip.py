"""Dev-only: renders frames of a baked clip on the built doll, for checking
a retarget by eye (Workbench, so it is quick).

    blender --background --factory-startup --python art/doll/blender/anim_strip.py -- \
        walk-easy /tmp/strip [frames=4] [view=side] [sex=female] [show=Outfit_jeans]

Writes /tmp/strip_0.png ... one per frame, evenly over the clip; montage
them with ImageMagick. Reads .cache/out (the raw build), not public/.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".cache", "out")
args = sys.argv[sys.argv.index("--") + 1 :]
clip, prefix = args[0], args[1]
opts = dict(a.split("=") for a in args[2:])
count = int(opts.get("frames", 4))
view = opts.get("view", "side")
sfx = "-m" if opts.get("sex") == "male" else ""

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"body{sfx}.glb"))
body_rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for part in filter(None, opts.get("show", "").split(",")):
    kind, name = part.split("_", 1)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"{kind.lower()}-{name}{sfx}.glb"))
    for o in set(bpy.data.objects) - before:
        if o.type == "MESH":
            for m in o.modifiers:
                if m.type == "ARMATURE":
                    m.object = body_rig
            o.parent = body_rig
        elif o.type == "ARMATURE":
            bpy.data.objects.remove(o)
# the importer leaves shape keys at the file's default weights; the base
# shape is every key at 0, the worn parts' tucks at 1
shown = {"tuck_" + p.split("_", 1)[1] for p in opts.get("show", "").split(",") if p}
for ob in bpy.data.objects:
    if ob.type == "MESH" and ob.data.shape_keys:
        for kb in ob.data.shape_keys.key_blocks:
            kb.value = 1.0 if kb.name in shown else 0.0
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"anims{sfx}.glb"))
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
act = next(a for a in bpy.data.actions if a.name.startswith(clip))
body_rig.animation_data_create()
body_rig.animation_data.action = act
if act.slots:
    body_rig.animation_data.action_slot = act.slots[0]
f0, f1 = act.frame_range

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.resolution_x, sc.render.resolution_y = 420, 760
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "OBJECT"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.1
sc.camera = cam
d = {"side": Vector((1, 0, 0)), "front": Vector((0, -1, 0)), "three": Vector((1, -1, 0)).normalized()}[view]
cam.location = Vector((0, 0, 0.95)) + d * 6
cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
for i in range(count):
    f = f0 + (f1 - f0) * i / max(1, count)
    sc.frame_set(int(f), subframe=f - int(f))
    sc.render.filepath = f"{prefix}_{i}.png"
    bpy.ops.render.render(write_still=True)
print("frames", f0, f1)
