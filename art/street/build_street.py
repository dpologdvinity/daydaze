"""Street furniture for the city (see docs/assets.md for sources).

Builds one GLB per kind in $OUT: Quaternius' Street Pack lamp and signs (CC0),
Poly Haven's hydrant, trash can and bench (CC0, cut down to a few hundred
triangles), and a few simple originals the packs lack (mailbox, newspaper box,
parking meter, bike rack, bus shelter). Each model
stands on y = 0, centered on x and z, facing +z (toward the street), sized in
meters, with its materials kept apart so the client can instance each part.

    SRC_Q=<Street Pack FBX dir> SRC_PH=<dir of Poly Haven gltf folders> \\
    OUT=<dir> blender --background --factory-startup --python art/street/build_street.py
"""

import math
import os

import bpy
from mathutils import Vector

SRC_Q = os.environ["SRC_Q"]
SRC_PH = os.environ["SRC_PH"]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def bake_and_join():
    """Applies every transform, joins all meshes into one object (materials kept)."""
    bpy.ops.object.select_all(action="DESELECT")
    ms = meshes()
    for o in bpy.context.scene.objects:
        o.parent = None if o.type != "MESH" else o.parent
    for o in ms:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def bounds(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def fit(o, height=None, length=None, keep_xy=False):
    """Scales to `height` (or longest side `length`), stands on z = 0, centers x and y."""
    lo, hi = bounds(o)
    size = hi - lo
    s = height / size.z if height else length / max(size.x, size.y)
    o.scale = (s, s, s)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = bounds(o)
    c = (lo + hi) / 2
    o.location = (0 if keep_xy else -c.x, 0 if keep_xy else -c.y, -lo.z)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def decimate(o, tris):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n <= tris:
        return
    m = o.modifiers.new("d", "DECIMATE")
    m.ratio = tris / n
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="d")


def export(name):
    for o in meshes():
        for mod in list(o.modifiers):
            o.modifiers.remove(mod)
    bpy.ops.export_scene.gltf(
        filepath=f"{OUT}/{name}.glb",
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    print("BUILT", name, sum(len(p.vertices) - 2 for o in meshes() for p in o.data.polygons))


def opaque():
    """The Street Pack FBX materials import with alpha 0 (glTF would cut them out)."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                for link in list(n.inputs["Alpha"].links):
                    m.node_tree.links.remove(link)
                n.inputs["Alpha"].default_value = 1.0
        if hasattr(m, "blend_method"):
            m.blend_method = "OPAQUE"
        if m.name.startswith("Glass"):
            # the lamp's lantern: see-through, so the plan's bulb glows inside
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    n.inputs["Alpha"].default_value = 0.3
            if hasattr(m, "blend_method"):
                m.blend_method = "BLEND"


def imported(path, height=None, length=None, tris=None, turn=0.0, keep_xy=False):
    reset()
    if path.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    opaque()
    o = bake_and_join()
    o.rotation_euler[2] = turn
    bpy.ops.object.transform_apply(rotation=True)
    fit(o, height=height, length=length, keep_xy=keep_xy)
    if tris:
        decimate(o, tris)
    return o


# --- originals: simple primitives with flat colors -------------------------

MATS = {}


def mat(name, color, metal=0.0, rough=0.6, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    r, g, bl = (int(color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    # glTF colors are linear
    lin = lambda v: v**2.2
    b.inputs["Base Color"].default_value = (lin(r), lin(g), lin(bl), 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    MATS[name] = m
    return m


def box(w, d, h, x, y, z, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    o.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return o


def cyl(r, h, x, y, z, m, verts=12, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(rotation=True)
    o.data.materials.append(m)
    return o


def finish(name):
    o = bake_and_join()
    export(name)


def build_mailbox():
    reset(); MATS.clear()
    blue, dark = mat("mail-blue", "#1f4e9c", rough=0.45), mat("mail-dark", "#16171b", rough=0.5)
    cyl(0.3, 0.55, 0, 0, 0.78, blue, 16, rot=(math.pi / 2, 0, 0))  # rounded top
    box(0.6, 0.55, 0.78, 0, 0, 0.12, blue)
    box(0.5, 0.5, 0.12, 0, 0, 0, dark)  # base
    box(0.36, 0.04, 0.08, 0, -0.29, 0.8, dark)  # mail slot (front = -y)
    box(0.3, 0.03, 0.2, 0, -0.28, 0.45, mat("mail-white", "#e8e8ea"))  # plate
    finish("mailbox")


def build_newsbox():
    reset(); MATS.clear()
    red, dark, glass = mat("news-red", "#b3202a", rough=0.4), mat("news-dark", "#1b1b1f"), mat("news-glass", "#2a3238", rough=0.2)
    box(0.5, 0.45, 0.9, 0, 0, 0.3, red)
    box(0.54, 0.5, 0.06, 0, 0, 1.2, red)  # lid
    box(0.38, 0.03, 0.3, 0, -0.23, 0.82, glass)  # window
    box(0.3, 0.04, 0.14, 0, -0.24, 0.5, dark)  # coin door
    for sx in (-0.2, 0.2):
        box(0.06, 0.06, 0.3, sx, 0, 0, dark)  # legs
    finish("newsbox")


def build_meter():
    reset(); MATS.clear()
    grey, dark, glass = mat("meter-grey", "#7c8187", metal=0.6, rough=0.4), mat("meter-dark", "#26282c"), mat("meter-glass", "#9ec6d8", rough=0.1)
    cyl(0.035, 1.05, 0, 0, 0, grey, 8)
    box(0.2, 0.14, 0.3, 0, 0, 1.0, dark)
    cyl(0.07, 0.03, 0, -0.08, 1.2, glass, 12, rot=(math.pi / 2, 0, 0))
    cyl(0.1, 0.06, 0, 0, 1.3, dark, 12)
    finish("meter")


def build_bikerack():
    # staple hoops: two posts and a bar, side on
    reset(); MATS.clear()
    steel = mat("rack-steel", "#b9bcc2", metal=0.8, rough=0.35)
    for i in range(3):
        x = (i - 1) * 0.55
        for y in (-0.2, 0.2):
            cyl(0.025, 0.78, x, y, 0, steel, 8)
        cyl(0.025, 0.45, x, 0, 0.78, steel, 8, rot=(math.pi / 2, 0, 0))
    finish("bikerack")


def build_busstop():
    reset(); MATS.clear()
    frame, glass, wood, ad = (
        mat("bus-frame", "#2d3138", metal=0.6, rough=0.4),
        mat("bus-glass", "#a8d0e0", rough=0.1, alpha=0.35),
        mat("bus-wood", "#8a5b36", rough=0.7),
        mat("bus-ad", "#f4efe2", rough=0.5),
    )
    w, d, h = 3.2, 1.3, 2.5
    for sx in (-w / 2 + 0.05, w / 2 - 0.05):
        for sy in (-d / 2 + 0.05, d / 2 - 0.05):
            box(0.1, 0.1, h, sx, sy, 0, frame)
    box(w + 0.3, d + 0.3, 0.12, 0, 0, h, frame)  # roof
    box(w, 0.04, h - 0.4, 0, d / 2 - 0.05, 0.3, glass)  # back
    for sx in (-w / 2 + 0.05, w / 2 - 0.05):
        box(0.04, d - 0.1, h - 0.4, sx, 0, 0.3, glass)  # ends
    box(1.0, 0.05, 1.5, w / 2 - 0.9, d / 2 - 0.1, 0.5, ad)  # ad panel on the back glass
    box(2.0, 0.4, 0.06, -0.4, d / 2 - 0.35, 0.5, wood)  # bench seat
    for sx in (-1.3, 0.5):
        box(0.06, 0.06, 0.5, sx, d / 2 - 0.35, 0, frame)
    cyl(0.04, 3.4, w / 2 + 0.5, -d / 2, 0, frame, 8)  # route sign pole
    box(0.5, 0.05, 0.5, w / 2 + 0.5, -d / 2, 2.6, mat("bus-sign", "#1b5fbf"))
    finish("busstop")


Q = lambda n: f"{SRC_Q}/{n}.fbx"
PH = lambda n: f"{SRC_PH}/{n}/{n}.gltf"

imported(Q("Streetlight_Single"), height=5.4, tris=450); export("lamp")
imported(Q("Sign_Stop"), height=2.4); export("sign-stop")
imported(Q("Sign_NoParking"), height=2.4); export("sign-noparking")
imported(PH("fire_hydrant"), height=0.8, tris=450); export("hydrant")
imported(PH("metal_trash_can"), height=0.95, tris=320); export("trashcan")
imported(PH("painted_wooden_bench"), length=1.8); export("bench")
build_mailbox(); build_newsbox(); build_meter(); build_bikerack(); build_busstop()
