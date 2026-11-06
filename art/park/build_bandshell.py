# Normalizes the band shell, produce crate, lawn chair and band instruments
# (Sketchfab and Poly Pizza downloads; see docs/assets.md) into game-sized GLBs:
# join every mesh, scale so the longest side (`h`: horizontal, `all`: any) is
# `length` meters, center on x/z, stand on the ground. Run via build_bandshell.sh.
import os
import sys

import bpy
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1 :]

# name -> (source glb, mode, length in meters)
PROPS = {
    "band-shell": ("openair.glb", "h", 10.0),
    "produce-crate": ("fruitcrate.glb", "h", 0.66),
    "lawn-chair": ("chair.glb", "all", 0.95),
    "band-trumpet": ("trumpet.glb", "all", 0.45),
    "band-sax": ("sax.glb", "all", 0.8),
    "band-drum": ("drum.glb", "all", 0.6),
    "band-stand": ("stand.glb", "all", 1.2),
}

os.makedirs(out, exist_ok=True)
for name, (glb, mode, length) in PROPS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, glb))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    assert meshes, name
    for o in list(bpy.context.scene.objects):
        if o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        o.parent = None
        o.matrix_world = o.matrix_world.copy()
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.active_object
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    size = hi - lo
    longest = max(size.x, size.y) if mode == "h" else max(size.x, size.y, size.z)
    k = length / longest
    obj.scale = (k, k, k)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = (-(lo.x + hi.x) / 2 * k, -(lo.y + hi.y) / 2 * k, -lo.z * k)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + ".glb"), export_format="GLB", export_yup=True)
