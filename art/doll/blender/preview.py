"""Dev-only: renders the built doll GLB in Blender for a quick look.

    blender --background --factory-startup --python art/doll/blender/preview.py -- face out.png
Views: face, profile, body, eye.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "..", "..", "..", "public", "models", "doll.raw.glb")
args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
view = args[0] if args else "face"
out = args[1] if len(args) > 1 else f"/tmp/doll-{view}.png"
keys = dict(a.split("=") for a in args[2:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
for ob in bpy.data.objects:
    if ob.type == "MESH" and ob.data.shape_keys:
        for kb in ob.data.shape_keys.key_blocks:
            if kb.name in keys:
                kb.value = float(keys[kb.name])
    if ob.type == "MESH" and ob.name.startswith(("Hair", "Outfit", "Lod")):
        ob.hide_render = ob.name not in keys.get("show", "").split(",")

skin = {
    "skin": (0.78, 0.55, 0.42, 1),
    "lashes": (0.02, 0.01, 0.01, 1),
    "eye": (0.25, 0.15, 0.08, 1),
}
for m in bpy.data.materials:
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if not bsdf:
        continue
    for k in skin:
        if m.name.startswith(k):
            bsdf.inputs["Base Color"].default_value = skin[k]
    if m.name == "cornea":
        bsdf.inputs["Alpha"].default_value = 0.08
        bsdf.inputs["Roughness"].default_value = 0.02

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.device = "CPU"
scene.render.resolution_x = 640
scene.render.resolution_y = 640 if view != "body" else 960
scene.render.filepath = out
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.3, 0.4, 1)
scene.world = world

VIEWS = {
    "face": ((0, -0.75, 1.56), (0, 0, 1.55), 22),
    "profile": ((-0.75, 0, 1.56), (0, 0, 1.55), 22),
    "eye": ((0.03, -0.3, 1.565), (0.03, 0, 1.56), 22),
    "body": ((0, -3.6, 1.0), (0, 0, 0.88), 30),
    "back": ((0, 3.6, 1.0), (0, 0, 0.88), 30),
}
loc, aim, fov = VIEWS[view]
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
cam.location = loc
cam.data.angle = math.radians(fov)
direction = Vector(aim) - Vector(loc)
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
for name, at, power in (("key", (1.5, -2.5, 2.5), 400), ("fill", (-2, -1.5, 1.5), 120)):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
    light.data.energy = power
    light.data.size = 1.5
    light.location = at
    light.rotation_euler = (Vector((0, 0, 1.3)) - Vector(at)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(light)
bpy.ops.render.render(write_still=True)
print("rendered", out)
