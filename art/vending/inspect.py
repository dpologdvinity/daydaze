"""Prints the extent, triangle count, objects and materials of the imported GLB (SRC)."""
import os
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ["SRC"])
ms = [o for o in bpy.data.objects if o.type == "MESH"]
for o in ms:
    print("INFO", o.name, sum(len(p.vertices) - 2 for p in o.data.polygons), [m.name for m in o.data.materials])
pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
print("INFO lo", tuple(round(c, 3) for c in lo), "hi", tuple(round(c, 3) for c in hi))
