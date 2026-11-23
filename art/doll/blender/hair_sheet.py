"""Dev-only: contact sheets of built hair styles, for judging a model's fit.

    blender --background --factory-startup --python-exit-code 1 \
        --python art/doll/blender/hair_sheet.py -- <out dir> <name,name,...> [key=value ...]

Each name is a hair part build_doll.py wrote to .cache/out (hair-<name>.glb,
hair-<name>-m.glb for the man). For each one this writes <out dir>/<name>.png:
one row per head and skin tone, the columns front, side, back and a
three-quarter close-up, the hair tinted like the client tints it (the grey
atlas times the root-to-tip vertex shading times look.hairColor).

Keys: sexes=f,m (which heads), skins=light,medium,deep, views=front,side,back,close,
res=256 (pixels per tile), samples=16, color=#6a3a24 (the hair color).
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".cache", "out")
args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
dest = args[0]
names = [n for n in args[1].split(",") if n]
keys = dict(a.split("=", 1) for a in args[2:])
sexes = keys.get("sexes", "f,m").split(",")
skins = keys.get("skins", "light,medium,deep").split(",")
views = keys.get("views", "front,side,back,close").split(",")
res = int(keys.get("res", 256))


def linear(hex_color):
    """A #rrggbb sRGB color as linear RGBA, like three.js's Color."""
    c = [int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)


HEX = keys.get("color", "#6a3a24")
HAIR = linear(HEX)
SKINS = {"light": "#f3d4c4", "medium": "#b8805a", "deep": "#5a3424"}
# camera at, aim, lens angle: head and shoulders, close-up three-quarter
VIEWS = {
    "front": ((0, -1.5, 1.52), (0, 0, 1.45), 19),
    "side": ((-1.5, 0, 1.52), (0, 0, 1.45), 19),
    "back": ((0, 1.5, 1.52), (0, 0, 1.45), 19),
    "close": ((-0.55, -0.6, 1.62), (0, 0, 1.58), 24),
}

os.makedirs(dest, exist_ok=True)
scene = bpy.context.scene


def setup(sex):
    """An empty scene with the doll's body, a camera and two area lights."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = int(keys.get("samples", 16))
    sc.cycles.use_denoising = True
    sc.cycles.device = "CPU"
    sc.cycles.max_bounces = 3
    sc.render.resolution_x = sc.render.resolution_y = res
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.3, 0.4, 1)
    sc.world = world
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"body{'-m' if sex == 'm' else ''}.glb"))
    for ob in list(sc.objects):
        if ob.type == "MESH":
            bake_rest(ob)
            # only the head and shoulders are ever in frame
            bm = bmesh.new()
            bm.from_mesh(ob.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 1.05], context="VERTS")
            bm.to_mesh(ob.data)
            bm.free()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    for name, at, power in (("key", (1.5, -2.5, 2.5), 400), ("fill", (-2, -1.5, 1.5), 120), ("rim", (0, 2.5, 2.5), 200)):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
        light.data.energy = power
        light.data.size = 1.5
        light.location = at
        light.rotation_euler = (Vector((0, 0, 1.4)) - Vector(at)).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(light)
    return sc


def bake_rest(ob):
    """Drops shape keys and the armature: the render needs neither, and
    Cycles re-evaluates both for every frame."""
    if ob.data.shape_keys:
        ob.shape_key_clear()
    for mod in list(ob.modifiers):
        ob.modifiers.remove(mod)
    ob.parent = None


def paint_skin(color):
    for m in bpy.data.materials:
        bsdf = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
        if bsdf and m.name.startswith("skin"):
            bsdf.inputs["Base Color"].default_value = color
        if bsdf and m.name.startswith(("lashes", "brow")):
            bsdf.inputs["Base Color"].default_value = (0.02, 0.01, 0.01, 1)


def tint(objects):
    """Multiplies each hair material's atlas by the hair color, as the
    client does (an untextured material takes the color alone)."""
    for ob in objects:
        if ob.type != "MESH":
            continue
        for m in ob.data.materials:
            if not m or not m.node_tree or m.get("tinted"):
                continue
            m["tinted"] = True
            nt = m.node_tree
            bsdf = nt.nodes.get("Principled BSDF")
            tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
            bsdf.inputs["Roughness"].default_value = 0.55
            if tex is None:
                bsdf.inputs["Base Color"].default_value = HAIR
                continue
            mul = nt.nodes.new("ShaderNodeMix")
            mul.data_type = "RGBA"
            mul.blend_type = "MULTIPLY"
            mul.inputs["Factor"].default_value = 1.0
            nt.links.new(tex.outputs["Color"], mul.inputs[6])
            mul.inputs[7].default_value = HAIR
            nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])


def render(sc, view, path):
    loc, aim, fov = VIEWS[view]
    cam = sc.camera
    cam.location = loc
    cam.data.angle = math.radians(fov)
    cam.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    px = np.empty(res * res * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    os.remove(path)
    return px.reshape(res, res, 4)


rows = {n: [] for n in names}
for sex in sexes:
    sc = setup(sex)
    for name in names:
        path = os.path.join(OUT, f"hair-{name}{'-m' if sex == 'm' else ''}.glb")
        if not os.path.exists(path):
            print("missing", path, flush=True)
            continue
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        added = [o for o in bpy.data.objects if o not in before]
        for o in added:
            if o.type == "MESH":
                mw = o.matrix_world.copy()
                bake_rest(o)
                o.matrix_world = mw
        tint(added)
        for skin in skins:
            paint_skin(linear(SKINS[skin]))
            tile = os.path.join(dest, f".tile-{name}.png")
            rows[name].append(np.concatenate([render(sc, v, tile) for v in views], axis=1))
        for o in added:
            bpy.data.objects.remove(o)
        print("rendered", name, sex, flush=True)

for name, strips in rows.items():
    if not strips:
        continue
    # Blender rows run bottom to top: the first strip goes on top
    sheet = np.concatenate(strips[::-1], axis=0)
    h, w = sheet.shape[:2]
    img = bpy.data.images.new(f"sheet-{name}", w, h, alpha=True)
    img.pixels.foreach_set(sheet.ravel())
    img.filepath_raw = os.path.join(dest, f"{name}.png")
    img.file_format = "PNG"
    img.save()
    print("wrote", img.filepath_raw, flush=True)
