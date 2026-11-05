"""Fits the downloaded wheelchair to the doll: scale, floor, seat position.

Source: "WheelChair" by Loic, Sketchfab f0ef4adc17ee4929b40e894c608061ea
(CC-BY 4.0), downloaded with the Sketchfab API into
art/doll/blender/.cache/wheelchair-src.glb (git-ignored).

    blender --background --factory-startup --python art/doll/blender/wheelchair.py

Writes .cache/out/wheelchair.glb with three nodes: "chair", and the rear
wheels "wheelL" and "wheelR", each with its origin on the axle so the client
can spin them about x as the chair rolls. Feet-on-floor at y = 0, the middle of the
seat over the origin, the footrests toward +z (the way a doll faces). Then
`bash scripts/optimize-doll.sh` (or gltf-transform optimize) compresses it
into public/models/doll/.
"""

import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".cache", "wheelchair-src.glb")
OUT = os.path.join(HERE, ".cache", "out", "wheelchair.glb")
# seat height 0.46 m; the model is over-wide for the doll, so 10% narrower
SCALE = 0.55
SCALE_X = SCALE * 0.9
# the big rear wheels (source units): axle center and rim radius
WHEEL_YZ = (0.37, -0.42)
WHEEL_R = 0.62

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
# loose parts: the rear wheels (tire, rim, spokes, hub: everything out at the
# sides inside the wheel's circle) become their own objects
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")
groups = {"chair": [], "wheelL": [], "wheelR": []}
for part in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    vs = [v.co for v in part.data.vertices]
    cx = sum(v.x for v in vs) / len(vs)
    inside = all(
        math.hypot(v.y - WHEEL_YZ[0], v.z - WHEEL_YZ[1]) <= WHEEL_R for v in vs
    )
    if abs(cx) > 0.52 and inside:
        groups["wheelL" if cx > 0 else "wheelR"].append(part)
    else:
        groups["chair"].append(part)
joined = {}
for name, parts in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined[name] = bpy.context.active_object
    joined[name].name = name
obj = joined["chair"]

floor = min(v.co.z for part in joined.values() for v in part.data.vertices)
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
for part in joined.values():
    for v in part.data.vertices:
        w = v.co + shift
        v.co = Vector((w.x * SCALE_X, w.y * SCALE, w.z * SCALE))
    part.data.update()
# each wheel turns about its axle: origin there, the part moved to match
for name in ("wheelL", "wheelR"):
    part = joined[name]
    axle = Vector(
        (
            sum(v.co.x for v in part.data.vertices) / len(part.data.vertices),
            (WHEEL_YZ[0] - seat_y) * SCALE,
            (WHEEL_YZ[1] - floor) * SCALE,
        )
    )
    for v in part.data.vertices:
        v.co -= axle
    part.location = axle
bpy.ops.object.select_all(action="SELECT")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# Blender -y (the footrests) exports as glTF +z
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True)
print("seat height", (seat_z - floor) * SCALE)
