"""Dev-only: renders a Mixamo take's own skeleton as a stick figure, side
on, at the same clip phases anim_strip.py uses, so a retarget can be
checked against its source by eye.

    blender --background --factory-startup --python art/doll/blender/source_strip.py -- \
        walking/Walk_Female-Walk /tmp/src [frames=4]

Writes /tmp/src_0.png ... (one per frame).
"""

import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1 :]
rel, prefix = args[0], args[1]
opts = dict(a.split("=") for a in args[2:])
count = int(opts.get("frames", 4))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(HERE, "..", "..", "..", "mixamo", rel + ".fbx"))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
f0, f1 = arm.animation_data.action.frame_range
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.resolution_x, sc.render.resolution_y = 420, 760
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.1 * 1.05  # the take's character is ~5% taller
sc.camera = cam
d = Vector((1, 0, 0))
cam.location = Vector((0, 0, 0.95 * 1.05)) + d * 6
cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
stick = None
for i in range(count):
    f = f0 + (f1 - f0) * i / max(1, count)
    sc.frame_set(int(f), subframe=f - int(f))
    # one tube per bone, joint to child joint
    verts, edges, index = [], [], {}
    for pb in arm.pose.bones:
        index[pb.name] = len(verts)
        verts.append(arm.matrix_world @ pb.head)
    for pb in arm.pose.bones:
        if pb.parent:
            edges.append((index[pb.parent.name], index[pb.name]))
    if stick:
        bpy.data.objects.remove(stick)
    me = bpy.data.meshes.new("stick")
    me.from_pydata(verts, edges, [])
    stick = bpy.data.objects.new("stick", me)
    sc.collection.objects.link(stick)
    skin = stick.modifiers.new("skin", "SKIN")
    for v in me.skin_vertices[0].data:
        v.radius = (0.025, 0.025)
    arm.hide_render = True
    sc.render.filepath = f"{prefix}_{i}.png"
    bpy.ops.render.render(write_still=True)
