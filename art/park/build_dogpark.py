# Normalizes the dog park's downloaded props (Poly Pizza; see docs/assets.md) into
# game-sized GLBs: join the wanted meshes, scale so the longest horizontal side is
# `length` meters, center on x/z, stand on the ground. Run via build_dogpark.sh.
import os
import sys

import bpy
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1 :]

# name -> (source glb, mesh names to keep (None = all), longest horizontal side in meters)
PROPS = {
    "agility-tunnel": ("tunnels.glb", ["tunnel_straight_A", "tunnel_straight_B"], 5.0),
    "agility-ramp": ("ramp.glb", None, 2.6),
    "agility-seesaw": ("seesaw.glb", None, 3.0),
    "dog-bowl": ("bowl2.glb", None, 0.7),
    "tennis-ball": ("ball.glb", None, 0.2),
}

os.makedirs(out, exist_ok=True)
for name, (glb, keep, length) in PROPS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, glb))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and (keep is None or o.name in keep)]
    assert meshes, name
    for o in list(bpy.context.scene.objects):
        if o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # bake the node transforms (the Poly Google seesaw hides a huge unit scale in them)
    for o in meshes:
        o.parent = None
        o.matrix_world = o.matrix_world.copy()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.active_object
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    k = length / max(hi.x - lo.x, hi.y - lo.y)
    obj.scale = (k, k, k)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = (-(lo.x + hi.x) / 2 * k, -(lo.y + hi.y) / 2 * k, -lo.z * k)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + ".glb"), export_format="GLB", export_yup=True)
