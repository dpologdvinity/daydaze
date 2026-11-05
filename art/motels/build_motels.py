"""Converts Quaternius's building packs (CC0) to one GLB per building for the
Beachside motels and Suburbia's extra houses.

Sources, under $MOTELS_SRC (default /tmp/daydaze-city/q):
  Ultimate_Textured_Building_Pack__Dec_2019 (textured, pastel palettes),
  and Buildings_pack__Aug_2017.

Run: blender --background --factory-startup --python art/motels/build_motels.py
Writes art/motels/.cache/out/<name>.glb (joined to one mesh, origin at the
ground center, +z the front, the longer side one unit like Kenney's houses) and prints each size in meters.
scripts/import-motels.sh compresses the chosen ones into public/models/.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

SRC = os.environ.get("MOTELS_SRC", "/tmp/daydaze-city/q")
OUT = os.path.join(os.path.dirname(__file__), ".cache")
UT = os.path.join(
    SRC,
    "Ultimate_Textured_Building_Pack__Dec_2019",
    "Ultimate Textured Building Pack - Dec 2019",
    "Textured Models",
    "Finished Textured Buildings",
    "FBX",
)
AUG = os.path.join(SRC, "Buildings_pack__Aug_2017", "Buildings pack - Aug 2017")
UT_TEX = os.path.join(UT, "..", "..", "Textures")
AUG_TEX = os.path.join(AUG, "Textures")


def find(root, stem):
    for dirpath, _, files in os.walk(root):
        if stem + ".fbx" in files:
            return os.path.join(dirpath, stem + ".fbx")
    raise FileNotFoundError(stem)


# output name -> (pack root, file stem, palette folder, palette). `motel-*` and `cottage-*` are
# Beachside's (public/models/beachside/), `house-q-*` Suburbia's extra homes
# (public/models/suburbia/).
MODELS = {
    "motel-long": (UT, "2Story_Wide_2Doors", UT_TEX, "Texture_Green"),
    "motel-stairs": (UT, "2Story_Stairs", UT_TEX, "Texture_Light2"),
    "motel-balcony": (UT, "2Story_Balcony", UT_TEX, "Texture_Yellow"),
    "motel-tower": (UT, "3Story_Balcony", UT_TEX, "Texture_Blue"),
    "motel-hotel": (UT, "4Story_Wide_2Doors", UT_TEX, "Texture_Light"),
    "motel-flat": (AUG, "Flat", AUG_TEX, "HouseTexture3"),
    "motel-flat2": (AUG, "Flat2", AUG_TEX, "HouseTexture4"),
    "cottage-gable": (UT, "1Story_GableRoof", UT_TEX, "Texture_Red"),
    "cottage-round": (UT, "1Story_RoundRoof", UT_TEX, "Texture_Blue"),
    "cottage-two": (UT, "2Story_GableRoof", UT_TEX, "Texture_Green"),
    "cottage-wide": (AUG, "House5", AUG_TEX, "HouseTexture4"),
    "house-q-1": (AUG, "House", AUG_TEX, "HouseTexture1"),
    "house-q-2": (AUG, "House2", AUG_TEX, "HouseTexture2"),
    "house-q-3": (AUG, "House3", AUG_TEX, "HouseTexture3"),
    "house-q-4": (AUG, "House4", AUG_TEX, "HouseTexture4"),
    "house-q-side": (UT, "2Story_Sidehouse", UT_TEX, "Texture_Light2"),
    "house-q-columns": (UT, "2Story_Columns", UT_TEX, "Texture_Yellow"),
}

# palette colors that stay as drawn: windows, doors, wood, red, dark trim
KEEP = {(0, 0, 0), (237, 28, 36), (134, 83, 61), (102, 70, 48), (120, 69, 43), (63, 63, 63)}


def pastel(image):
    """The packs' palettes are muted; lighten the walls and roofs toward
    white for the Ocean City pastels, keeping windows, doors and trim."""
    px = list(image.pixels)
    for i in range(0, len(px), 4):
        rgb = tuple(round(c * 255) for c in px[i : i + 3])
        # pixels are linear floats; compare in sRGB-ish bytes by gamma
        srgb = tuple(round(255 * (c ** (1 / 2.2))) for c in px[i : i + 3])
        if any(all(abs(a - b) < 6 for a, b in zip(srgb, k)) for k in KEEP):
            continue
        if sum(srgb) / 3 > 190:
            continue
        for j in range(3):
            c = px[i + j]
            px[i + j] = c + (1.0 - c) * 0.5
    image.pixels = px


def paint(ob, tex_dir, tex):
    """Gives the joined mesh one pastel palette material."""
    image = bpy.data.images.load(os.path.join(tex_dir, tex + ".png"))
    image.colorspace_settings.name = "sRGB"
    pastel(image)
    image.pack()
    mat = bpy.data.materials.new(tex)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    node = nodes.new("ShaderNodeTexImage")
    node.image = image
    node.interpolation = "Closest"
    links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.9
    ob.data.materials.clear()
    ob.data.materials.append(mat)


only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
os.makedirs(os.path.join(OUT, "out"), exist_ok=True)


def bounds(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def load(root, stem, reset=True):
    if reset:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=find(root, stem))
    for mat in bpy.data.materials:  # FBX imports can carry alpha 0
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    for link in list(node.inputs["Alpha"].links):
                        mat.node_tree.links.remove(link)
                    node.inputs["Alpha"].default_value = 1.0
        mat.blend_method = "OPAQUE"
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    mn, mx = bounds(ob)
    ob.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    bpy.ops.object.transform_apply(location=True)
    return ob


MAX_TRIS = 3000  # a house is drawn at most this big (HOUSE_TRIANGLES in nyc.ts)


def thin(ob):
    """Decimates the mesh down to MAX_TRIS triangles when it is bigger."""
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris <= MAX_TRIS:
        return
    mod = ob.modifiers.new("thin", "DECIMATE")
    mod.ratio = MAX_TRIS / tris
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)


sizes = {}
for name, (root, stem, tex_dir, tex) in MODELS.items():
    if only and only != ["sheet"] and name not in only:
        continue
    ob = load(root, stem)
    thin(ob)
    paint(ob, tex_dir, tex)
    mn, mx = bounds(ob)
    k = 1.0 / max(mx.x - mn.x, mx.y - mn.y)
    ob.scale = (k, k, k)
    bpy.ops.object.transform_apply(scale=True)
    mn, mx = bounds(ob)
    s = mx - mn
    sizes[name] = s
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, "out", name + ".glb"), export_format="GLB"
    )
    print(f"SIZE {name} w={s.x:.3f} d={s.y:.3f} h={s.z:.3f} tris={sum(len(p.vertices) - 2 for p in ob.data.polygons)}")

