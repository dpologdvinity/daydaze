"""Converts Quaternius' nature packs (CC0) into small GLBs for the forest trail.

Run: blender --background --factory-startup --python art/forest/build_forest.py
Reads the unpacked packs under $FOREST_PACKS (default /tmp/forest) and writes
.cache/out/<name>.glb; scripts/import-forest.sh compresses them into
public/models/forest/.

Each model is ONE mesh with its origin at the bottom center. The Ultimate
Nature Pack models bake their material colors into COLOR_0 under a single
material (one draw call per kind when instanced); the Textured Stylized Trees
keep their texture.
"""

import os

import bpy

PACKS = os.environ.get("FOREST_PACKS", "/tmp/forest")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "out")
NATURE = "Ultimate_Nat/Ultimate Nature Pack - Jun 2019/FBX"
TREES = "Textured_Sty/Textured Stylized Trees - May 2020/FBX"

# output name -> (folder, fbx, textured)
SOURCES = {}
for out, fbx in {
    "pine-1": "PineTree_1", "pine-3": "PineTree_3", "birch-2": "BirchTree_2",
    "birch-4": "BirchTree_4", "autumn-2": "CommonTree_Autumn_2",
    "autumn-4": "CommonTree_Autumn_4", 
    "willow-2": "Willow_2", "willow-4": "Willow_4", "dead-1": "CommonTree_Dead_1",
    "stump": "TreeStump", "stump-moss": "TreeStump_Moss", "log": "WoodLog",
    "log-moss": "WoodLog_Moss", "rock-moss-1": "Rock_Moss_1",
    "rock-moss-3": "Rock_Moss_3", "rock-5": "Rock_5", "bush-1": "Bush_1",
    "bush-berries-1": "BushBerries_1", 
    "flowers": "Flowers", "grass": "Grass", "grass-short": "Grass_Short",
}.items():
    SOURCES[out] = (NATURE, fbx, False)
for out, fbx in {"tree-3": "Tree_3", "tbirch-4": "Birch_4", "tpine-2": "Pine_2"}.items():
    SOURCES[out] = (TREES, fbx, True)


def bake_colors(ob):
    """Bakes each material's base color into one COLOR_0 and drops the materials."""
    me = ob.data
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
        cols.append(c)
    for poly in me.polygons:
        c = cols[poly.material_index] if poly.material_index < len(cols) else (0.8, 0.8, 0.8, 1.0)
        for li in poly.loop_indices:
            attr.data[li].color = c
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = list(me.color_attributes).index(attr)
    me.materials.clear()
    mat = bpy.data.materials.new("Forest")
    mat.use_nodes = True
    me.materials.append(mat)


TEXTURES = os.path.join(PACKS, "Textured_Sty/Textured Stylized Trees - May 2020/Textures")
# material name -> (texture file, cutout leaves?)
TEXTURE_OF = {
    "Bark": ("Tree_Bark.jpg", False), "Tree_Leaves": ("Tree_Leaves.png", True),
    "Birch_Bark": ("Birch_Bark.png", False), "Birch_Leaves": ("Birch_Leaves_Green.png", True),
    "Pine_Leaves": ("Pine_Leaves.png", True),
}


def retexture(ob):
    """The FBX points at absolute texture paths: rebuild each material from Textures/."""
    for i, old in enumerate(list(ob.data.materials)):
        file, cutout = TEXTURE_OF[old.name.split(".")[0]]
        mat = bpy.data.materials.new(old.name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Roughness"].default_value = 0.8
        bsdf.inputs["Metallic"].default_value = 0.0
        img = mat.node_tree.nodes.new("ShaderNodeTexImage")
        img.image = bpy.data.images.load(os.path.join(TEXTURES, file))
        mat.node_tree.links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
        if cutout:
            mat.node_tree.links.new(img.outputs["Alpha"], bsdf.inputs["Alpha"])
            mat.blend_method = "CLIP"
            mat.use_backface_culling = False
        ob.data.materials[i] = mat


def convert(name, folder, fbx, textured):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(PACKS, folder, fbx + ".fbx"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # origin at the bottom center
    zs = [v.co.z for v in ob.data.vertices]
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    for v in ob.data.vertices:
        v.co.x -= (max(xs) + min(xs)) / 2
        v.co.y -= (max(ys) + min(ys)) / 2
        v.co.z -= min(zs)
    if textured:
        retexture(ob)
    else:
        bake_colors(ob)
    out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", export_animations=False, export_apply=False,
        export_vertex_color="ACTIVE", export_image_format="AUTO" if textured else "NONE",
        export_extras=False, export_yup=True,
    )
    print("BUILT", name, len(ob.data.polygons), "faces, height", round(max(zs) - min(zs), 2), os.path.getsize(out))


os.makedirs(OUT, exist_ok=True)
for n, (folder, fbx, textured) in SOURCES.items():
    convert(n, folder, fbx, textured)
