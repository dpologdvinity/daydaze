"""Normalizes the Fairground's downloaded Sketchfab models for the game.

Run: blender --background --factory-startup --python art/fair/build_fair.py [-- name ...]
Reads $FAIR_SRC (default /tmp/fair-sk) and writes .cache/out/<name>.glb;
scripts/import-fair.sh then compresses them into public/models/fair/.

Each model is joined into one mesh with its world transform applied, scaled so
its `fit` axis is `size` meters, and recentred so the origin sits at `anchor`
(the bottom center, or the center). Textures are kept.
"""

import os
import sys

import bpy
from mathutils import Vector

SRC = os.environ.get("FAIR_SRC", "/tmp/fair-sk")
OUT = os.path.join(os.path.dirname(__file__), ".cache", "out")

# name -> (fit axis 0=x 1=y 2=z, size in meters, anchor "bottom" or "center", yaw about y in degrees, lift in meters)
MODELS = {
    # Enkarra's gondola: 1.1 m tall, its floor 0.33 m below the origin, where the riders' hips sit
    "cabin": (1, 1.1, "bottom", 0, 0.33),
    # Ramon Ruiz's carousel horse: 1.6 m tall with its pole
    "horse": (1, 1.6, "bottom", 0, 0),
}


def convert(name, spec):
    axis, size, anchor, yaw, lift = spec
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name + ".glb"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    for o in meshes:  # detach from parents, keeping the world transform
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    # glTF is y-up; Blender's import turns it z-up, so the glTF axes are x, z, -y
    k = size / (mx - mn)[[0, 2, 1][axis]]
    ob.scale = (k, k, k)
    bpy.ops.object.transform_apply(scale=True)
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (mn + mx) / 2
    base = Vector((c.x, c.y, mn.z if anchor == "bottom" else c.z))
    ob.location -= base
    ob.location.z += lift
    bpy.ops.object.transform_apply(location=True)
    if yaw:
        ob.rotation_euler[2] = yaw * 3.14159265 / 180
        bpy.ops.object.transform_apply(rotation=True)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True)
    dims = [round(x, 2) for x in ob.dimensions]
    print("BUILT", name, dims, os.path.getsize(out))


only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for n, spec in MODELS.items():
    if not only or n in only:
        convert(n, spec)
