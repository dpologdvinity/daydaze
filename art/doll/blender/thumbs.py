"""Renders the closet's picture tiles into public/closet/: one square image
per hair style and face preset, on the built doll, so the character creator
shows options instead of words.

    blender --background --factory-startup --python art/doll/blender/thumbs.py [-- outfits hair]

Run after build_doll.py, then convert to WebP (192 px) with sharp, as the
commit that added it did; the client loads `/closet/<group>-<id>.webp`. Hair tiles are three-quarter views in a warm brown;
face tiles are tight front views with only that preset's key on.
"""

import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".cache", "out")
DEST = os.path.join(HERE, "..", "..", "..", "public", "closet")

HAIR = [
    "waves", "ponytail", "buns", "bob", "braids", "afro", "long-straight",
    "long-curly", "mid-straight", "mid-wavy", "mid-curly", "pixie",
    "mermaid", "shag", "coils", "low-pony", "pigtails", "top-knot",
]
PRESETS = {
    "eye": ["almond", "round", "hooded", "upturned", "downturned"],
    "nose": ["straight", "button", "narrow", "wide", "roman"],
    "lips": ["natural", "full", "thin", "heart", "wide"],
    "face": ["oval", "round", "heart", "square", "diamond"],
}
FIGURES = ["classic", "curvy", "slim", "athletic"]
# outfit id -> (cut, shoes, linear colour); ids match OUTFITS in src/game/look.ts
OUTFITS = {
    "flares": ("flares", "sneakers", (0.02, 0.6, 0.55, 1)),
    "mini": ("mini", "platforms", (0.3, 0.1, 0.9, 1)),
    "fur": ("fur", "boots", (0.85, 0.82, 0.95, 1)),
    "jeans": ("jeans", "sneakers", (0.9, 0.45, 0.05, 1)),
    "shorts": ("shorts", "sneakers", (0.03, 0.03, 0.04, 1)),
    "blouse": ("blouse", "platforms", (1.0, 0.05, 0.35, 1)),
    "tracksuit-y2k": ("flares", "sneakers", (1.0, 0.25, 0.6, 1)),
    "baby-tee-mini": ("mini", "platforms", (1.0, 0.75, 0.9, 1)),
    "sequin-slip": ("mini", "platforms", (0.95, 0.8, 0.3, 1)),
    "glam-faux-fur": ("fur", "boots", (1.0, 0.1, 0.5, 1)),
}
# `-- outfits` renders only that group
SKIN = (0.55, 0.3, 0.19, 1)  # linear: a warm medium tone
HAIR_COLOUR = (0.035, 0.014, 0.008, 1)  # linear: dark brown


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = 256
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 8
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.5, 0.45, 0.55, 1)
    bg.inputs[1].default_value = 0.8
    scene.world = world
    for name, at, power in (("key", (1.2, -2.0, 2.4), 260), ("fill", (-1.6, -1.2, 1.6), 90), ("rim", (0, 1.5, 2.2), 120)):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
        light.data.energy = power
        light.data.size = 1.2
        light.location = at
        light.rotation_euler = (Vector((0, 0, 1.45)) - Vector(at)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(light)


def paint(ob, colour, roughness=0.5):
    m = bpy.data.materials.new(ob.name + "_tile")
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = roughness
    return m


CLOTH = (0.75, 0.2, 0.45, 1)


def load(*parts):
    """Imports the parts and recolours them by object: skin, hair, cloth.
    glTF import renames materials, so colours go on fresh ones per object."""
    for p in parts:
        bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, p + ".glb"))
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        name = ob.name
        if name.startswith("Hair"):
            # each slot keeps its strand image under the tint, and the cards
            # their cut-out alpha, so the tile shows strands, not solid sheets
            for slot in ob.material_slots:
                old = slot.material
                mat = paint(ob, HAIR_COLOUR, 0.75)
                # the tile's sun turns glossy strands grey at grazing angles
                spec = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                spec.inputs["Specular IOR Level"].default_value = 0.2
                nodes = old.node_tree.nodes if old and old.use_nodes else []
                tex_old = next((n for n in nodes if n.type == "TEX_IMAGE"), None)
                if tex_old:
                    nt = mat.node_tree
                    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
                    tex = nt.nodes.new("ShaderNodeTexImage")
                    tex.image = tex_old.image
                    mix = nt.nodes.new("ShaderNodeMix")
                    mix.data_type = "RGBA"
                    mix.blend_type = "MULTIPLY"
                    mix.inputs["Factor"].default_value = 1.0
                    mix.inputs["A"].default_value = HAIR_COLOUR
                    nt.links.new(tex.outputs["Color"], mix.inputs["B"])
                    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
                    if any(l.to_socket.name == "Alpha" for l in old.node_tree.links):
                        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
                slot.material = mat
            continue
        elif name.startswith(("Outfit", "Swim", "Shoes")):
            mat = paint(ob, CLOTH, 0.6)
            # keep the garment's own detail map (denim, stripes) under the tint
            old = ob.active_material
            img = next((n.image for n in old.node_tree.nodes if n.type == "TEX_IMAGE"), None) if old and old.use_nodes else None
            if img:
                nt = mat.node_tree
                tex = nt.nodes.new("ShaderNodeTexImage")
                tex.image = img
                mix = nt.nodes.new("ShaderNodeMix")
                mix.data_type = "RGBA"
                mix.blend_type = "MULTIPLY"
                mix.inputs["Factor"].default_value = 1.0
                mix.inputs["A"].default_value = CLOTH
                nt.links.new(tex.outputs["Color"], mix.inputs["B"])
                bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
                nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        elif name.startswith("Eyes"):
            mat = None
        else:
            mat = None
        if mat:
            ob.data.materials.clear()
            ob.data.materials.append(mat)
            continue
        # body and eyes: keep slots, recolour by the slot's role
        for i, slot in enumerate(ob.material_slots):
            role = (slot.material.name if slot.material else "").lower()
            if "lash" in role:
                colour, rough = (0.02, 0.01, 0.01, 1), 0.6
            elif "cornea" in role:
                colour, rough = (0.05, 0.025, 0.015, 1), 0.05
            elif "eye" in role or name.startswith("Eyes"):
                colour, rough = (0.05, 0.025, 0.015, 1), 0.2
            else:
                colour, rough = SKIN, 0.5
            slot.material = paint(ob, colour, rough)


def keys(values):
    for ob in bpy.data.objects:
        if ob.type == "MESH" and ob.data.shape_keys:
            for kb in ob.data.shape_keys.key_blocks:
                if kb.name != "Basis":
                    kb.value = values.get(kb.name, 0.0)


def camera(loc, aim, fov):
    scene = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = loc
    cam.data.angle = math.radians(fov)
    cam.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam


def render(name):
    os.makedirs(DEST, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(DEST, name + ".png")
    bpy.ops.render.render(write_still=True)


def main():
    import sys

    only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not only or "outfits" in only:
        global CLOTH
        for oid, (cut, shoes, colour) in OUTFITS.items():
            CLOTH = colour
            reset()
            load("body", "hair-waves", f"outfit-{cut}", f"shoes-{shoes}")
            keys({f"tuck_{cut}": 1.0, f"tuck_{shoes}": 1.0})
            camera((0, -3.3, 0.95), (0, 0, 0.88), 30)
            render(f"outfit-{oid}")
        for style, colour in (("one-piece", (1.0, 0.1, 0.4, 1)), ("bikini", (0.02, 0.6, 0.55, 1))):
            CLOTH = colour
            reset()
            load("body", "hair-waves", f"swim-{style}")
            keys({f"tuck_{style}": 1.0})
            camera((0, -3.3, 0.95), (0, 0, 0.88), 30)
            render(f"swim-{style}")
    if not only or "hair" in only:
        for style in HAIR:
            reset()
            load("body", f"hair-{style}")
            camera((0.55, -0.95, 1.6), (0, 0, 1.47), 34)
            render(f"hair-{style}")
    if only:
        return
    for group, options in PRESETS.items():
        for o in options:
            reset()
            load("body", "hair-buns")
            keys({f"{group}_{o}": 1.0})
            # frame the feature the preset changes, so tiles differ at a glance
            shot = {
                "eye": ((0.0, -0.45, 1.548), (0.0, 0.0, 1.546), 24),
                "nose": ((0.2, -0.45, 1.51), (0.0, -0.13, 1.503), 22),
                "lips": ((0.0, -0.32, 1.485), (0.0, 0.0, 1.485), 20),
                "face": ((0.0, -0.75, 1.53), (0.0, 0.0, 1.5), 26),
            }[group]
            camera(*shot)
            render(f"{group}-{o}")
    for fig in FIGURES:
        reset()
        load("body", "swim-one-piece")
        keys({fig: 1.0, "tuck_one-piece": 1.0})
        camera((0, -3.3, 0.95), (0, 0, 0.88), 30)
        render(f"figure-{fig}")


main()
