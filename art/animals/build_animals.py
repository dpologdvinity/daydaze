"""Converts Quaternius' animated animals and fish (CC0) into one small GLB each.

Run: blender --background --factory-startup --python art/animals/build_animals.py
Reads the unpacked packs under $ANIMAL_PACKS (default /tmp/daydaze-city/q) and
writes .cache/out/<name>.glb; scripts/import-animals.sh then compresses them
into public/models/animals/.

Every model comes out as ONE skinned mesh with ONE vertex-colored material
(each material's base color is baked into COLOR_0), so a creature costs a single
draw call, and only the clips the game plays are kept (see CLIPS).
"""

import glob
import os
import sys

import bpy

PACKS = os.environ.get("ANIMAL_PACKS", "/tmp/daydaze-city/q")
OUT = os.path.join(os.path.dirname(__file__), ".cache", "out")

ANIMALS = "Ultimate_Animated_Animals__July_2021/Ultimate Animated Animals - July 2021/glTF"
FISH = "Animated_Fish_Pack_by__Quaternius/Animated Fish Pack by @Quaternius/FBX"
CUTE = "Cute_Fish_Pack__Feb_2020/Cute Fish Pack - Feb 2020/FBX"

# output name -> source file
SOURCES = {}
for n in ["Alpaca", "Horse", "Donkey", "Cow", "Deer", "Fox", "Wolf", "Husky", "ShibaInu"]:
    SOURCES[n.lower()] = f"{ANIMALS}/{n}.gltf"
for n in ["Dolphin", "Fish1", "Fish2", "Fish3", "Manta ray", "Shark", "Whale"]:
    SOURCES[n.lower().replace(" ", "-")] = f"{FISH}/{n}.fbx"
for n in ["Clownfish", "BlueTang", "YellowTang", "Goldfish", "Puffer", "Koi",
          "ButterflyFish", "Lionfish", "MandarinFish", "ZebraClownFish"]:
    SOURCES["cute-" + n.lower()] = f"{CUTE}/{n}.fbx"

# Zoo species downloaded from poly.pizza (see docs/assets.md): the zebra is
# rigged with clips; the rest are static meshes the client sways and bobs.
POLY = "../poly"
for n in ["zebra", "giraffe", "elephant", "lion", "penguin", "flamingo", "cat", "rabbit"]:
    SOURCES[n] = f"{POLY}/{n}.glb"
# Sea life from Poly Pizza (art/ocean/fetch_ocean.py puts them in
# art/ocean/.cache/glb): the grouper and crab are skinned, the turtle is static.
OCEAN = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ocean", ".cache", "glb")
for n in ["grouper", "crab", "turtle"]:
    SOURCES[n] = os.path.join(OCEAN, n + ".glb")

# Clips kept (matched by suffix after the last "|"), renamed to the key.
CLIPS = {
    "Idle": "idle", "Idle_Eating": "eat", "Idle_2": "idle2", "Idle_Headlow": "graze",
    "Eating": "eat", "Walk": "walk", "Gallop": "run",
    "Idle_HitReact1": "react", "Run": "run", "Swim": "swim", "Swimming_Normal": "swim",
    "WalkSlow": "walkslow",
}


def vertex_color_single_material(meshes):
    """Bakes each material's base color into one COLOR_0 and joins the meshes."""
    for ob in meshes:
        me = ob.data
        # drop imported vertex colors (the zebra's are plain white): the
        # materials' colors are the look
        for old in list(me.color_attributes):
            me.color_attributes.remove(old)
        attr = me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
        cols = []
        for mat in me.materials:
            c = (0.8, 0.8, 0.8, 1.0)
            if mat and mat.node_tree:
                bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if bsdf:
                    c = tuple(bsdf.inputs["Base Color"].default_value)
                    # glTF import wires vertex color x factor through a Mix node:
                    # the material's own color is that node's B color input
                    for link in bsdf.inputs["Base Color"].links:
                        if link.from_node.type == "MIX":
                            b = [i for i in link.from_node.inputs if i.name == "B" and i.type == "RGBA"]
                            if b:
                                c = tuple(b[0].default_value)
            cols.append(c)
        for poly in me.polygons:
            c = cols[poly.material_index] if poly.material_index < len(cols) else (0.8, 0.8, 0.8, 1.0)
            for li in poly.loop_indices:
                attr.data[li].color = c
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = list(me.color_attributes).index(attr)
        me.materials.clear()
    bpy.ops.object.select_all(action="DESELECT")
    for ob in meshes:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    mat = bpy.data.materials.new("Animal")
    mat.use_nodes = True
    ob.data.materials.append(mat)
    return ob


def keep_clips(arm):
    """Drops every action the game doesn't play and renames the rest."""
    kept = {}
    for act in list(bpy.data.actions):
        key = act.name.split("|")[-1].split(".")[0]
        if key in CLIPS and CLIPS[key] not in kept:
            act.name = CLIPS[key]
            act.use_fake_user = True
            kept[act.name] = act
    for act in list(bpy.data.actions):
        if act.name not in kept:
            bpy.data.actions.remove(act)
    if arm.animation_data and kept:
        arm.animation_data.action = kept.get("idle") or kept.get("swim")
    return kept


def convert(name, path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.dimensions.length > 1e-4]
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o not in meshes]:
        bpy.data.objects.remove(o)
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    vertex_color_single_material(meshes)
    kept = keep_clips(arm) if arm else {}
    out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", export_animations=True,
        export_animation_mode="ACTIONS", export_force_sampling=True,
        export_optimize_animation_size=True, export_apply=False,
        export_vertex_color="ACTIVE", export_image_format="NONE",
        export_extras=False, export_yup=True,
    )
    print("BUILT", name, sorted(kept), os.path.getsize(out))


os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for name, rel in SOURCES.items():
    if only and name not in only:
        continue
    convert(name, os.path.join(PACKS, rel))
