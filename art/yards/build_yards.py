"""Block-yard props from downloaded CC0 models (Poly Pizza), sized and thinned.

Sources (docs/assets.md has the credits):
    dumpster      "Dumpster" by Quaternius                 (PKsbolkZSr)
    fence-chain   "Metal Fence" by Quaternius              (qWKhREFj7H)
    fence-wood    "Wood Fence 2" by CircuitZ               (hRx8dQKVCA)
    bag           "Trash Bag" by Quaternius                (jYrMKg2Q7C)
    court         "Basketball court" by Poly by Google     (85FpUr2fHkH, CC-BY 3.0)

Each GLB is imported, its node transforms applied, scaled to real size (meters,
the fences to one 3 m panel) and stood on y = 0 centered on x and z, thinned
(decimated) where heavy, and exported. A preview PNG per model is rendered next
to it when PREVIEW=1, to check size and which way it faces (the client turns
each by its yaw, +z being its front).

    SRC=<dir with the .glb downloads> OUT=<dir> [PREVIEW=1] \\
    blender --background --factory-startup --python art/yards/build_yards.py

then `bash scripts/import-yards.sh` optimizes them into public/models/yards/.
"""

import math
import os

import bpy
from mathutils import Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)

# name, source id, target size (x, height) in meters (None keeps the aspect),
# decimate ratio, yaw in degrees to turn the model so its front faces +z
MODELS = [
    ("dumpster", "PKsbolkZSr", (2.0, None), 1.0, 0),
    ("fence-chain", "qWKhREFj7H", (3.0, 2.4), 1.0, 0),
    ("fence-wood", "hRx8dQKVCA", (3.0, 1.8), 1.0, 0),
    ("bag", "jYrMKg2Q7C", (0.55, None), 0.18, 0),
    # a whole 15 x 29 m court with its hoops and fence (CC-BY 3.0, Poly by Google)
    ("court", "85FpUr2fHkH", (15.2, None), 1.0, 0),
]


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]


def build(name, src, size, ratio, yaw):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, src + ".glb"))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects:
        if o.type != "MESH":
            o.select_set(False)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.parent = None
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Blender is z up: x across, y depth, z height
    lo, hi = bounds(objs)
    sx, sh = size
    kx = sx / (hi[0] - lo[0]) if sx else None
    kh = sh / (hi[2] - lo[2]) if sh else None
    kx = kx or kh
    kh = kh or kx
    for o in objs:
        o.scale = (kx, kx, kh)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lo, hi = bounds(objs)
    for o in objs:
        o.location = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    if yaw:
        for o in objs:
            o.rotation_euler = (0, 0, math.radians(yaw))
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    if ratio < 1:
        for o in objs:
            mod = o.modifiers.new("lod", "DECIMATE")
            mod.ratio = ratio
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier="lod")
    tris = sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=False)
    lo, hi = bounds(objs)
    print("BUILT", name, tris, "tris", [round(h - l, 2) for l, h in zip(lo, hi)])
    if os.environ.get("PREVIEW"):
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
        bpy.context.scene.collection.objects.link(cam)
        r = max(hi[0] - lo[0], hi[2] - lo[2]) * 1.8 + 1
        cam.location = (r * 0.7, -r, (hi[2] - lo[2]) * 0.8)
        direction = Vector((0, 0, (hi[2] - lo[2]) / 2)) - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.camera = cam
        sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
        sun.rotation_euler = (math.radians(50), 0, math.radians(30))
        bpy.context.scene.collection.objects.link(sun)
        bpy.context.scene.render.engine = "BLENDER_WORKBENCH"
        bpy.context.scene.display.shading.light = "STUDIO"
        bpy.context.scene.display.shading.color_type = "TEXTURE"
        bpy.context.scene.render.resolution_x = 480
        bpy.context.scene.render.resolution_y = 360
        bpy.context.scene.render.filepath = os.path.join(OUT, name + ".png")
        bpy.ops.render.render(write_still=True)


for m in MODELS:
    build(*m)
