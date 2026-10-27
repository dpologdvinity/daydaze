"""Street furniture for the city (see docs/assets.md for sources).

Builds one GLB per kind in $OUT: Quaternius' Street Pack lamp and signs (CC0),
Poly Haven's hydrant, trash can and bench (CC0), and Poly Pizza downloads
(mailbox, parking meter, bike rack, bus shelter, palm, planter, traffic light),
all cut down to a few hundred triangles. Each model
stands on y = 0, centered on x and z, facing +z (toward the street), sized in
meters, with its materials kept apart so the client can instance each part.

    SRC_Q=<Street Pack FBX dir> SRC_PH=<dir of Poly Haven gltf folders> SRC_PP=<dir of Poly Pizza glbs> \\
    OUT=<dir> blender --background --factory-startup --python art/street/build_street.py
"""

import math
import os

import bpy
from mathutils import Vector

SRC_Q = os.environ["SRC_Q"]
SRC_PH = os.environ["SRC_PH"]
SRC_PP = os.environ["SRC_PP"]
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
    if path.endswith(".fbx"):
        opaque()
    o = bake_and_join()
    o.rotation_euler[2] = turn
    bpy.ops.object.transform_apply(rotation=True)
    fit(o, height=height, length=length, keep_xy=keep_xy)
    if tris:
        decimate(o, tris)
    return o


Q = lambda n: f"{SRC_Q}/{n}.fbx"
PH = lambda n: f"{SRC_PH}/{n}/{n}.gltf"

PP = lambda n: f"{SRC_PP}/{n}.glb"

imported(Q("Streetlight_Single"), height=5.4, tris=350); export("lamp")
imported(Q("Sign_Stop"), height=2.4); export("sign-stop")
imported(Q("Sign_NoParking"), height=2.4); export("sign-noparking")
imported(PH("fire_hydrant"), height=0.8, tris=300); export("hydrant")
imported(PH("metal_trash_can"), height=0.95, tris=250); export("trashcan")
imported(PH("painted_wooden_bench"), length=1.8); export("bench")
# Poly Pizza downloads (see docs/assets.md)
imported(PP("mailbox"), height=1.15, tris=240); export("mailbox")
imported(PP("meter"), height=1.4, tris=400); export("meter")
imported(PP("bikerack"), height=0.9, tris=200); export("bikerack")
imported(PP("busstop"), height=2.9, tris=300); export("busstop")
imported(PP("palm1"), height=7.0, tris=350); export("palm")
imported(PP("planter"), length=1.8, tris=250); export("planter")
