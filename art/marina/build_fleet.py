"""The offshore fleet: Quaternius' CC0 Ships pack as one-draw ships.

Each ship (cruise liner, sail ship, Viking boat, lifeboat) is joined into one
mesh, scaled to its length in meters, turned bow toward +z and sunk to its
waterline (y = 0), then recolored in the house palette: every face's UV points
at one cell of a tiny palette strip, and a second strip of the same layout
lights only the windows, so a ship is one mesh, one material, one draw call and
glows at night with the material's emissive intensity. The sail ship also gets
a decimated twin for the city's far horizon (`sail-lo`).

    SRC=<Ships FBX dir> OUT=<dir> \\
    blender --background --factory-startup --python art/marina/build_fleet.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt
(no --texture-compress: the palette strips must stay exact).
"""

import math
import os
import tempfile

import bpy
from mathutils import Matrix, Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)
SCRATCH = tempfile.mkdtemp(prefix="fleet-")

# Quaternius material name -> (house color, lit at night). Windows are the
# cruise ship's "Texture" material.
PALETTE = {
    "F2F2F2": ("#fff4ea", False),
    "White": ("#fff4ea", False),
    "Texture": ("#ffd98a", True),
    "Red": ("#ff5a6a", False),
    "DarkRed": ("#9a2f45", False),
    "Black": ("#1b2a4a", False),
    "Steel": ("#aab4c8", False),
    "Wood": ("#8a5a3a", False),
    "DarkWood": ("#5a3320", False),
    "LightWood": ("#c28a52", False),
    "Fabric": ("#fff1dc", False),
    "Sail": ("#fff1dc", False),
    "C5B99A": ("#f2e6c8", False),
}
NAMES = list(PALETTE)

# file -> (FBX name, length in meters, how deep the hull sits as a share of its
# height, turn it round (its bow is on Blender +y)?, decimate to this many faces)
SHIPS = {
    "cruise": ("CruiseShip", 150, 0.16, False, None),
    "sail": ("Sail ship", 26, 0.22, False, None),
    "sail-lo": ("Sail ship", 26, 0.22, False, 500),
    "viking": ("Viking boat", 12, 0.25, False, None),
    "lifeboat": ("Lifeboat", 7, 0.3, False, None),
}


def linear(hex_color):
    """sRGB hex to linear floats (glTF colors and textures are decoded to linear)."""
    out = []
    for i in (1, 3, 5):
        c = int(hex_color[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def strip(name, colors):
    """A one-pixel-tall image, one pixel per palette cell, sRGB-tagged."""
    made = bpy.data.images.new(name + "-src", width=len(colors), height=1, alpha=False)
    made.pixels = [v for c in colors for v in (*c, 1.0)]
    made.filepath_raw = os.path.join(SCRATCH, name + ".png")
    made.file_format = "PNG"
    made.save()
    # a generated image exports blank; one loaded from its file exports as is
    img = bpy.data.images.load(made.filepath_raw)
    img.colorspace_settings.name = "sRGB"
    img.pack()
    return img


def lit_material(name):
    """One material: palette as base color, the window strip as emission."""
    base = [(linear(PALETTE[n][0])) for n in NAMES]
    glow = [(linear(PALETTE[n][0]) if PALETTE[n][1] else [0, 0, 0]) for n in NAMES]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    tree = m.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.8
    bsdf.inputs["Emission Strength"].default_value = 1.0
    for socket, colors, tag in (("Base Color", base, "palette"), ("Emission Color", glow, "glow")):
        tex = tree.nodes.new("ShaderNodeTexImage")
        tex.image = strip(f"{name}-{tag}", colors)
        tex.interpolation = "Closest"
        tex.extension = "EXTEND"
        tree.links.new(tex.outputs["Color"], bsdf.inputs[socket])
    return m


def build(file, spec):
    fbx, length, draft, turn, faces = spec
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, fbx + ".fbx"))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        o.parent = None
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    ship = bpy.context.view_layer.objects.active
    me = ship.data

    # which palette cell every face belongs to, before the materials go
    cell = []
    for poly in me.polygons:
        name = me.materials[poly.material_index].name
        if name not in PALETTE:
            raise SystemExit(f"{fbx}: material {name!r} has no house color in PALETTE")
        cell.append(NAMES.index(name))
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for poly, c in zip(me.polygons, cell):
        for loop in poly.loop_indices:
            uv.data[loop].uv = ((c + 0.5) / len(NAMES), 0.5)
    me.materials.clear()
    me.materials.append(lit_material("fleet-" + file))

    # length along y, bow toward +y, scaled to meters, waterline at z = 0, centered
    pts = [v.co for v in me.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    s = length / (hi.y - lo.y)
    center = (lo + hi) / 2
    me.transform(
        Matrix.Scale(s, 4)
        @ Matrix.Translation((-center.x, -center.y, -lo.z - draft * (hi.z - lo.z)))
    )
    # glTF is Y-up with the bow toward +z: Blender (x, y, z) -> glTF (x, z, -y), so
    # a bow on Blender -y lands on glTF +z
    if turn:
        me.transform(Matrix.Rotation(math.pi, 4, "Z"))
    if faces:
        mod = ship.modifiers.new("d", "DECIMATE")
        mod.ratio = faces / len(me.polygons)
        bpy.context.view_layer.objects.active = ship
        bpy.ops.object.modifier_apply(modifier="d")
    bpy.ops.object.select_all(action="DESELECT")
    ship.select_set(True)
    ship.name = file
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, file + ".glb"),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
        export_materials="EXPORT",
    )


for file, spec in SHIPS.items():
    build(file, spec)
