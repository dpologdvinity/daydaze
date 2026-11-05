"""Fits the downloaded wheelchair to the doll: scale, floor, seat position.

Source: "WheelChair" by Loic, Sketchfab f0ef4adc17ee4929b40e894c608061ea
(CC-BY 4.0), downloaded with the Sketchfab API into
art/doll/blender/.cache/wheelchair-src.glb (git-ignored).

    blender --background --factory-startup --python art/doll/blender/wheelchair.py

Writes .cache/out/wheelchair.glb: feet-on-floor at y = 0, the middle of the
seat over the origin, the footrests toward +z (the way a doll faces). Then
`bash scripts/optimize-doll.sh` (or gltf-transform optimize) compresses it
into public/models/doll/.
"""

import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".cache", "wheelchair-src.glb")
OUT = os.path.join(HERE, ".cache", "out", "wheelchair.glb")
# the model is a little over-wide for the doll: seat height 0.46 m
SCALE = 0.55

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in meshes:
    o.parent = None
    o.matrix_world = o.matrix_world.copy()
obj = meshes[0]
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

verts = [v.co.copy() for v in obj.data.vertices]
floor = min(v.z for v in verts)
# the seat: up-facing faces of the fabric, the commonest height
seat_z = None
best = {}
for p in obj.data.polygons:
    if p.normal.z > 0.95 and abs(p.center.x) < 0.45:
        k = round(p.center.z, 2)
        best[k] = best.get(k, 0.0) + p.area
seat_z = max(best, key=best.get)
seat_y = sum(p.center.y for p in obj.data.polygons
             if p.normal.z > 0.95 and abs(round(p.center.z, 2) - seat_z) < 0.02
             and abs(p.center.x) < 0.45) / max(1, sum(
                 1 for p in obj.data.polygons
                 if p.normal.z > 0.95 and abs(round(p.center.z, 2) - seat_z) < 0.02
                 and abs(p.center.x) < 0.45))
shift = Vector((0, -seat_y, -floor))
for v in obj.data.vertices:
    v.co = (v.co + shift) * SCALE
obj.name = "wheelchair"
obj.data.update()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# Blender -y (the footrests) exports as glTF +z
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True)
print("seat height", (seat_z - floor) * SCALE)
