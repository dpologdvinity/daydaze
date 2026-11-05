"""Cuts the lower half of a downloaded prosthetic leg for the doll.

Source: "leg prosthesis" by victorghys, Sketchfab
59d7e2b28b8b45ec8b179fff0134ceec (CC-BY 4.0), downloaded with the Sketchfab
API into art/doll/blender/.cache/prosthesis-src.glb (git-ignored).

    blender --background --factory-startup --python art/doll/blender/prosthesis.py

Keeps the pylon, ankle and foot (everything below the knee joint), centers
the pylon over the origin, turns the toe toward glTF +z (the way a doll
faces), puts the top at y = 0 and scales the piece to 1 m long, hanging
down. The client (Prosthetics.tsx) scales it to the doll's shin and hangs it
from her shin bone. Writes .cache/out/prosthesis.glb; scripts/optimize-doll.sh
compresses it into public/models/doll/.
"""

import math
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".cache", "prosthesis-src.glb")
OUT = os.path.join(HERE, ".cache", "out", "prosthesis.glb")
# the knee joint's lowest point in the source's units; below it is kept
CUT_Z = 215.0

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
keep = []
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        continue
    o.parent = None
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    top = max((o.matrix_world @ v.co).z for v in o.data.vertices)
    if top <= CUT_Z:
        keep.append(o)
    else:
        bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in keep:
    o.select_set(True)
bpy.context.view_layer.objects.active = keep[0]
bpy.ops.object.join()
leg = bpy.context.active_object
leg.name = "prosthesis"
verts = [v.co for v in leg.data.vertices]
low = min(v.z for v in verts)
height = CUT_Z - low
# the pylon: the thin column above the foot, centered over the origin
pylon = [v for v in verts if low + 0.45 * height < v.z < low + 0.9 * height]
cx = sum(v.x for v in pylon) / len(pylon)
cy = sum(v.y for v in pylon) / len(pylon)
scale = 1.0 / height
for v in leg.data.vertices:
    # turn 180 degrees about z: the toe (+y in the source) points to -y,
    # which exports as glTF +z
    x, y = v.co.x - cx, v.co.y - cy
    v.co.x, v.co.y = -x * scale, -y * scale
    v.co.z = (v.co.z - CUT_Z) * scale
leg.data.update()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True)
print("pieces", len(keep), "tris", sum(len(p.vertices) - 2 for p in leg.data.polygons))
