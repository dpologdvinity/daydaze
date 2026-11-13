"""The offshore fleet: Quaternius' CC0 Ships pack as one-draw ships.

Each ship (cruise liner, sail ship, Viking boat, lifeboat) is joined into one
mesh, scaled to its length in meters, turned bow toward +z and sunk to its
waterline (y = 0), then recolored in the house palette: every face's UV points
at one cell of a tiny palette strip, so a ship is one mesh with one material
and one draw call. The cruise liner's window bands keep their own UVs and a
second material (the pack's Windows.png redrawn as navy panes in a cream wall,
with an emission twin lighting only the panes), so it glows at night with the
material's emissive intensity for two draw calls. The sail ship also gets a
decimated twin for the city's far horizon (`sail-lo`).

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

# Quaternius material name -> house color. The cruise liner's "Texture" material
# (its window bands) is handled apart, below.
PALETTE = {
    "F2F2F2": "#fff4ea",
    "White": "#fff4ea",
    "Red": "#ff5a6a",
    "DarkRed": "#9a2f45",
    "Black": "#1b2a4a",
    "Steel": "#aab4c8",
    "Wood": "#8a5a3a",
    "DarkWood": "#5a3320",
    "LightWood": "#c28a52",
    "Fabric": "#fff1dc",
    "Sail": "#fff1dc",
    "C5B99A": "#f2e6c8",
}
NAMES = list(PALETTE)
WINDOWS = "Texture"
WALL = "#fff4ea"
PANE = "#2b4a7a"
PANE_LIT = "#ffd98a"

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


def palette_material(name):
    """One flat material: the palette strip as base color."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    tree = m.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.8
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = strip(name + "-palette", [linear(PALETTE[n]) for n in NAMES])
    tex.interpolation = "Closest"
    tex.extension = "EXTEND"
    tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def windows_material(name):
    """The window bands: panes in a wall by day, the panes alone lit at night."""
    src = bpy.data.images.load(os.path.join(SRC, "..", "Blends", "Windows.png"))
    w, h = src.size
    px = list(src.pixels)
    wall, pane, lit = linear(WALL), linear(PANE), linear(PANE_LIT)
    base, glow = [], []
    for i in range(0, len(px), 4):
        is_pane = (px[i] + px[i + 1] + px[i + 2]) / 3 < 0.5
        base += [*(pane if is_pane else wall), 1.0]
        glow += [*(lit if is_pane else (0, 0, 0)), 1.0]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    tree = m.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Emission Strength"].default_value = 1.0
    for socket, pixels, tag in (("Base Color", base, "walls"), ("Emission Color", glow, "panes")):
        made = bpy.data.images.new(f"{name}-{tag}-src", width=w, height=h, alpha=False)
        made.pixels = pixels
        made.filepath_raw = os.path.join(SCRATCH, f"{name}-{tag}.png")
        made.file_format = "PNG"
        made.save()
        tex = tree.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(made.filepath_raw)
        tex.image.pack()
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

    # which palette cell every face belongs to (None: a window band), before the materials go
    cell = []
    for poly in me.polygons:
        name = me.materials[poly.material_index].name
        if name == WINDOWS:
            cell.append(None)
        elif name in PALETTE:
            cell.append(NAMES.index(name))
        else:
            raise SystemExit(f"{fbx}: material {name!r} has no house color in PALETTE")
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for poly, c in zip(me.polygons, cell):
        if c is None:
            continue
        for loop in poly.loop_indices:
            uv.data[loop].uv = ((c + 0.5) / len(NAMES), 0.5)
    me.materials.clear()
    me.materials.append(palette_material("fleet-" + file))
    if any(c is None for c in cell):
        me.materials.append(windows_material("fleet-" + file + "-windows"))
    # (clearing the slots reset every face to slot 0)
    for poly, c in zip(me.polygons, cell):
        poly.material_index = 0 if c is not None else 1

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
