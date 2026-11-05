"""Cuts the pylon of a downloaded prosthetic leg for the doll.

Source: "leg prosthesis" by victorghys, Sketchfab
59d7e2b28b8b45ec8b179fff0134ceec (CC-BY 4.0), downloaded with the Sketchfab
API into art/doll/blender/.cache/prosthesis-src.glb (git-ignored).

    blender --background --factory-startup --python art/doll/blender/prosthesis.py

Keeps only the pylon and its ankle adapter (the doll keeps her own foot,
inside her shoe), centers the pylon over the origin, puts its top at y = 0
and scales it to 1 m long, hanging down. The client (Prosthetics.tsx) fits it
between the doll's knee and ankle and hangs it from her shin bone. Writes .cache/out/prosthesis.glb; scripts/optimize-doll.sh
compresses it into public/models/doll/.
"""

import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".cache", "prosthesis-src.glb")
OUT = os.path.join(HERE, ".cache", "out", "prosthesis.glb")
# the pylon and ankle adapter span these heights in the source's units
CUT_Z = 211.0
LOW_Z = 100.0

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
    zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
    if min(zs) >= LOW_Z and max(zs) <= CUT_Z + 1:
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
# the pylon: the thin column, found by its top, centered over the origin
pylon = [v for v in verts if v.z > CUT_Z - 0.1 * height]
cx = sum(v.x for v in pylon) / len(pylon)
cy = sum(v.y for v in pylon) / len(pylon)
scale = 1.0 / height
for v in leg.data.vertices:
    v.co.x, v.co.y = (v.co.x - cx) * scale, (v.co.y - cy) * scale
    v.co.z = (v.co.z - CUT_Z) * scale
leg.data.update()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True)
print("pieces", len(keep), "tris", sum(len(p.vertices) - 2 for p in leg.data.polygons))
