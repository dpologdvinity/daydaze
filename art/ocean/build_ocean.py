"""Builds the reef's props and the beach gulls from the downloaded models.

    python3 art/ocean/fetch_ocean.py
    blender --background --factory-startup --python art/ocean/build_ocean.py
    scripts/import-ocean.sh

Writes art/ocean/.cache/out/reef.glb (one mesh node per kind, each centered on
x/z with its base on the floor: coral-1..6 are MiniPoly's six reef sets, each
set joined into one mesh so an instance is one draw call, plus seaweed, anchor
and the Kenney ship wreck) and gulls.glb (the standing and the flying seagull).
Every node's real-world size is its natural size scaled by SCALE below.
"""

import glob
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, ".cache", "glb")
OUT = os.path.join(HERE, ".cache", "out")

# longest horizontal extent, meters, each kind is scaled to
SIZES = {
    "coral-1": 5.0, "coral-2": 4.5, "coral-3": 5.0, "coral-4": 4.5,
    "coral-5": 5.5, "coral-6": 5.5, "seaweed": 2.4, "anchor": 1.6,
    "wreck": 11.0, "gull": 0.55, "gull-fly": 1.3,
    # the dense reef: sea fans (the anemone, stood tall), branching coral,
    # drifting jellies and four kinds of rock, built into arches in code
    "fan": 1.5, "branch": 1.4, "jelly": 0.9,
    "rock-pillar": 4.2, "rock-flat": 4.0, "rock-moss": 3.0, "rock-spires": 4.5,
}


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_meshes(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        o.data.transform(o.matrix_world)  # bake the node transforms in
        o.parent = None
        o.matrix_world.identity()
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o)
    return meshes


def join(meshes, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def fit(ob, length, up_axis="Z"):
    """Centers on x/y (Blender), puts the base at z=0 and scales the longest
    horizontal extent to `length` meters."""
    pts = [Vector(c) for c in ob.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    s = length / max(hi.x - lo.x, hi.y - lo.y)
    ob.data.transform(
        __import__("mathutils").Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    )
    ob.data.transform(__import__("mathutils").Matrix.Scale(s, 4))


def export(path):
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_apply=False,
        export_image_format="AUTO", export_extras=False, export_yup=True,
        export_animations=False,
    )
    print("BUILT", path, os.path.getsize(path))


def main():
    clear()
    for i in range(1, 7):
        ob = join(import_meshes(os.path.join(IN, f"coral-set{i}.glb")), f"coral-{i}")
        fit(ob, SIZES[f"coral-{i}"])
    for src, name in (
        ("seaweed", "seaweed"),
        ("anchor", "anchor"),
        ("shipwreck", "wreck"),
        ("anemone", "fan"),
        ("fan-coral", "branch"),
        ("jellyfish", "jelly"),
        ("rock-large2", "rock-pillar"),
        ("rock-large", "rock-flat"),
        ("rock-medium", "rock-moss"),
        ("rock-mountains", "rock-spires"),
    ):
        ob = join(import_meshes(os.path.join(IN, src + ".glb")), name)
        fit(ob, SIZES[name])
    export(os.path.join(OUT, "reef.glb"))
    clear()
    for src, name in (("seagull", "gull"), ("seagull-fly", "gull-fly")):
        ob = join(import_meshes(os.path.join(IN, src + ".glb")), name)
        fit(ob, SIZES[name])
    export(os.path.join(OUT, "gulls.glb"))


main()
