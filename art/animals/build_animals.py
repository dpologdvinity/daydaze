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
for n in ["zebra", "giraffe", "elephant", "lion", "penguin", "flamingo", "cat", "rabbit", "pig", "sheep"]:
    SOURCES[n] = f"{POLY}/{n}.glb"
# Sea life from Poly Pizza (art/ocean/fetch_ocean.py puts them in
# art/ocean/.cache/glb): the grouper is skinned; the crab and turtle are static meshes.
OCEAN = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ocean", ".cache", "glb")
for n in ["grouper", "crab", "turtle"]:
    SOURCES[n] = os.path.join(OCEAN, n + ".glb")

# Sketchfab downloads (CC-BY, see docs/assets.md): textured and realistic, so
# they keep their materials and images instead of baking vertex colors. The
# giraffe's and lion's single clip is a calm idle, used for every state.
SKETCHFAB = "../sketchfab"
TEXTURED = {"giraffe", "elephant", "lion", "penguin"}
for n in TEXTURED | {"chicken"}:
    SOURCES[n] = f"{SKETCHFAB}/{n}.glb"

# Owner-downloaded Sketchfab animals (CC-BY; see docs/assets.md), unpacked one
# per directory under $ANIMAL_DOWNLOADS. They are textured like the giraffe and
# lion. The WildMesh bear and elk carry 50-80 clips; the tiger is an FBX whose
# takes sit on many helper nodes, so only actions that pose bones are kept.
DL = os.environ.get("ANIMAL_DOWNLOADS", "/tmp/animals")
DOWNLOADS = {
    "bear": "realistic_animated_bear_3d_model/scene.gltf",
    "elk": "realistic_animated_elk_3d_model/scene.gltf",
    "tiger": "tiger/source/Tiger.fbx",
    "labrador": "labrador-dog/source/Labrador.glb",
    "doe": "realistic-animated-doe-3d-model/source/Doe Animated.fbx",
    # the .rar's FBX unpacked next to the pack's textures/ (see docs/assets.md)
    "bluewhale": "whale-x/WhaleAnim03.fbx",
}
for n, rel in DOWNLOADS.items():
    SOURCES[n] = os.path.join(DL, rel)
TEXTURED |= set(DOWNLOADS)
# Triangle budget per model; heavier sources are decimated down to it.
MAX_TRIS = {"bear": 8000, "elk": 8000, "tiger": 8000, "labrador": 8000, "doe": 8000, "bluewhale": 8000}

# Clips kept (matched by suffix after the last "|"), renamed to the key.
CLIPS = {
    "Idle": "idle", "Idle_Eating": "eat", "Idle_2": "idle2", "Idle_Headlow": "graze",
    "Eating": "eat", "Walk": "walk", "Gallop": "run",
    "Idle_HitReact1": "react", "Run": "run", "Swim": "swim", "Swimming_Normal": "swim",
    "WalkSlow": "walkslow",
    # Sketchfab elephant ("TRS|...") and penguin
    "idle": "idle", "walk": "walk", "run": "run", "eating": "eat", "idle down": "graze",
    "idle trumpet": "react", "Preen": "graze", "Sleep": "sleep", "Sit1": "sit",
    "pecking": "graze", "walking": "walk", "rest": "sleep", "sitting-idle": "sit",
    "Take 01": "idle", "Animation": "idle", "Swimming": "swim",
    # WildMesh bear and elk: breathing is the calm idle, the other stand idle
    # the alert one; the elk's and bear's lying and sitting breaths serve pets
    "Stand_Breathing_01": "idle", "Stand_Idle_01": "idle2", "Stand_Eating_01": "graze",
    "Lying_Breathing_01": "sleep", "Sitting_Breathing_01": "sit", "SittingSpec_Breathing_01": "sit",
    "Hit_Stand_F01": "react", "Hit_Stand_L01": "react",
    # Tiger: no standing idle, so the prone rest is its idle and the howl its alert
    "Idle_Lie Prone": "idle", "Howl": "idle2", "Eat": "graze", "Walk Fast": "run",
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


def poses_bones(act):
    """True for actions that animate bones (FBX imports also make one per helper node)."""
    if hasattr(act, "fcurves"):
        curves = list(act.fcurves)
    else:  # Blender 5 layered actions
        curves = [fc for l in act.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
    return any(fc.data_path.startswith("pose.bones") for fc in curves)


def keep_clips(arm, bones_only=False):
    """Drops every action the game doesn't play and renames the rest."""
    kept = {}
    for act in list(bpy.data.actions):
        if bones_only and not poses_bones(act):
            continue
        parts = act.name.split("|")
        # FBX takes are named "Node|Take|" (empty last part)
        # glTF clips are plain names; FBX takes are "Node|Take|Layer"
        key = (parts[1] if len(parts) >= 3 else parts[-1]).split(".")[0]
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


def matte(meshes):
    """FBX materials import shiny and metal (the tiger's glTF reads as black):
    make unlinked metallic/roughness inputs a plain, matte fur and skin."""
    for ob in meshes:
        for mat in ob.data.materials:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if mat and mat.node_tree else None
            if not bsdf:
                continue
            if not bsdf.inputs["Metallic"].links:
                bsdf.inputs["Metallic"].default_value = 0.0
            if not bsdf.inputs["Roughness"].links and bsdf.inputs["Roughness"].default_value < 0.5:
                bsdf.inputs["Roughness"].default_value = 0.7


def paint_whale(meshes, path):
    """The whale's FBX arrives untextured: wire its BaseColor and Normal PNGs in."""
    tex = os.path.join(os.path.dirname(path), "textures")
    mat = bpy.data.materials.new("Whale")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    base = mat.node_tree.nodes.new("ShaderNodeTexImage")
    base.image = bpy.data.images.load(os.path.join(tex, "WhaleLow_lambert1_BaseColor.png"))
    mat.node_tree.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    for ob in meshes:
        ob.data.materials.clear()
        ob.data.materials.append(mat)


def decimate(meshes, budget):
    """Collapses the meshes together to about `budget` triangles (UVs and skin weights follow)."""
    total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    if total <= budget:
        return
    ratio = budget / total
    for ob in meshes:
        bpy.context.view_layer.objects.active = ob
        ob.shape_key_clear()  # a modifier can't be applied over shape keys
        mod = ob.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)


def convert(name, path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.dimensions.length > 1e-4]
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o not in meshes]:
        bpy.data.objects.remove(o)
    # helper shapes some artists leave in: a ground disc, a stand-in sphere
    for o in [o for o in meshes if o.name.startswith(("Circle", "Icosphere"))]:
        bpy.data.objects.remove(o)
        meshes.remove(o)
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if name not in TEXTURED:
        vertex_color_single_material(meshes)
    if name == "bluewhale":
        paint_whale(meshes, path)
    if name in DOWNLOADS:
        matte(meshes)
    if name in MAX_TRIS:
        decimate(meshes, MAX_TRIS[name])
    kept = keep_clips(arm, bones_only=name in DOWNLOADS and name != "bluewhale") if arm else {}
    out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", export_animations=True,
        export_animation_mode="ACTIONS", export_force_sampling=True,
        export_optimize_animation_size=True, export_apply=False,
        export_vertex_color="ACTIVE", export_image_format="AUTO" if name in TEXTURED else "NONE",
        export_extras=False, export_yup=True,
    )
    print("BUILT", name, sorted(kept), os.path.getsize(out))


os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for name, rel in SOURCES.items():
    if only and name not in only:
        continue
    convert(name, os.path.join(PACKS, rel))
