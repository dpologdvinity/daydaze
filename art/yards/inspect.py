"""Prints each downloaded GLB's size in meters after node transforms (a helper for build_yards.py).
    SRC=<dir> blender --background --factory-startup --python art/yards/inspect.py"""
import os
import bpy
from mathutils import Vector

for f in sorted(os.listdir(os.environ["SRC"])):
    if not f.endswith(".glb"):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(os.environ["SRC"], f))
    pts = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects if o.type == "MESH" for c in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    print("SIZE", f, [round(h - l, 2) for l, h in zip(lo, hi)], "z-up dims x,y,z (Blender)")
