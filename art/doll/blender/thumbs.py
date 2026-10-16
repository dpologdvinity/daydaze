"""Renders the closet's picture tiles into public/closet/: one square image
per hair style and face preset, on the built doll, so the character creator
shows options instead of words.

    blender --background --factory-startup --python art/doll/blender/thumbs.py

Run after build_doll.py. Hair tiles are three-quarter views in a warm brown;
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
]
PRESETS = {
    "eye": ["almond", "round", "hooded", "upturned", "downturned"],
    "nose": ["straight", "button", "narrow", "wide", "roman"],
    "lips": ["natural", "full", "thin", "heart", "wide"],
    "face": ["oval", "round", "heart", "square", "diamond"],
}
FIGURES = ["classic", "curvy", "slim", "athletic"]
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
            mat = paint(ob, HAIR_COLOUR, 0.45)
        elif name.startswith(("Outfit", "Swim", "Shoes")):
            mat = paint(ob, (0.75, 0.2, 0.45, 1), 0.6)
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
    for style in HAIR:
        reset()
        load("body", f"hair-{style}")
        camera((0.55, -0.95, 1.6), (0, 0, 1.47), 34)
        render(f"hair-{style}")
    for group, options in PRESETS.items():
        for o in options:
            reset()
            load("body", "hair-buns")
            keys({f"{group}_{o}": 1.0})
            camera((0, -0.7, 1.55), (0, 0, 1.52), 26)
            render(f"{group}-{o}")
    for fig in FIGURES:
        reset()
        load("body", "swim-one-piece")
        keys({fig: 1.0, "tuck_one-piece": 1.0})
        camera((0, -3.3, 0.95), (0, 0, 0.88), 30)
        render(f"figure-{fig}")


main()
