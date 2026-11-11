"""Builds the street kit from Quaternius' Downtown City MegaKit (CC0).

    KIT="/tmp/street-kit-kit" \
      flock /tmp/daydaze-blender.lock nice -n 19 blender --background \
      --factory-startup --python art/city/street_kit.py -- /tmp/street-kit.glb

KIT is the unzipped pack (it holds `Exports/` and `Textures/`). Run
`bash scripts/import-street.sh` to build and optimize it into
public/models/street/kit.glb. The pieces, each its own named node, all
centered on x = 0, z = 0 (glTF axes, y up), the client merges every instance
of them into two meshes (src/client/city/StreetPieces.tsx):

Decals (flat quads textured from the kit's weathered paint atlas,
T_Street_Decals, all on y = 0): `crosswalk`, `stop`, `slow`,
`doubleYellow`. Text and arrows read for a driver heading -z.

Solids (one flat vertex color each, no texture; the client draws them with
the sidewalk's concrete): `corner` (a sidewalk corner block, 4 m square with
a rounded kerb at its -x, +z corner, base y = 0, top y = 0.14 like the
city's sidewalks), `manhole`, `drain` (base y = 0) and `bollard` (base y = 0),
thinned to a few dozen triangles.
"""

import math
import os
import sys

import bmesh
import bpy

KIT = os.environ.get("KIT", "/tmp/street-kit-kit")
GLTF = os.path.join(KIT, "Exports", "glTF (Godot)")
ATLAS = os.path.join(KIT, "Textures", "T_Street_Decals.png")
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/street-kit.glb"

# our name -> kit module
DECALS = {
    "crosswalk": "Decal_Crosswalk_Wide",
    "stop": "Decal_Stop",
    "slow": "Decal_Slow",
    "doubleYellow": "Decal_DoubleYellow_Straight",
}
# our name -> (kit module, collapse ratio, linear color)
CONCRETE = (0.37, 0.35, 0.31)
IRON = (0.035, 0.035, 0.04)
SOLIDS = {
    "corner": ("Sidewalk_Corner_Round_3m", 1.0, CONCRETE),
    "manhole": ("Prop_ManholeCover", 0.3, IRON),
    "drain": ("Prop_Drain", 1.0, IRON),
    "bollard": ("Prop_Bollard", 0.3, IRON),
}
SIDEWALK_TOP = 0.14
CORNER_SIZE = 4.0


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_module(name):
    """The kit module's meshes, joined into one object with no parents."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(GLTF, name + ".gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        o.parent = None
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    for o in new:
        if o != obj and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    return obj


def decal_material():
    """One shared material: the paint atlas, alpha-blended."""
    mat = bpy.data.materials.new("decals")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    nodes = mat.node_tree.nodes
    image = nodes.new("ShaderNodeTexImage")
    image.image = bpy.data.images.load(ATLAS)
    bsdf = nodes["Principled BSDF"]
    mat.node_tree.links.new(image.outputs["Color"], bsdf.inputs["Base Color"])
    mat.node_tree.links.new(image.outputs["Alpha"], bsdf.inputs["Alpha"])
    return mat


def flat_material():
    mat = bpy.data.materials.new("solid")
    mat.use_nodes = True
    return mat


def make_decal(name, module, mat):
    obj = import_module(module)
    # lie flat at y = 0 (the kit floats each decal a different height)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z = 0.0
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.name = obj.data.name = name
    return obj


def paint(obj, color):
    """One flat vertex color on every corner, named Col like the bays."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    col = bm.loops.layers.float_color.new("Col")
    for f in bm.faces:
        for loop in f.loops:
            loop[col] = (*color, 1.0)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    attrs = obj.data.color_attributes
    attrs.active_color = attrs["Col"]
    attrs.render_color_index = attrs.find("Col")


def make_solid(name, module, ratio, color, mat):
    obj = import_module(module)
    for layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(layer)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    if ratio < 1.0:
        mod = obj.modifiers.new("collapse", "DECIMATE")
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
    zs = [v.co.z for v in obj.data.vertices]
    if name == "corner":
        # the kit's top is z = 0 and its base -0.15: stand it on the ground,
        # then fit the city's 4 m, 0.14 m sidewalk
        for v in obj.data.vertices:
            v.co.z -= min(zs)
            v.co.x *= CORNER_SIZE / 3.0
            v.co.y *= CORNER_SIZE / 3.0
            v.co.z *= SIDEWALK_TOP / (max(zs) - min(zs))
    else:
        for v in obj.data.vertices:
            v.co.z -= min(zs)
    paint(obj, color)
    obj.name = obj.data.name = name
    return obj


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def main():
    clear()
    objs = []
    deco = decal_material()
    for name, module in DECALS.items():
        objs.append(make_decal(name, module, deco))
    flat = flat_material()
    for name, (module, ratio, color) in SOLIDS.items():
        objs.append(make_solid(name, module, ratio, color, flat))
    for o in objs:
        print(f"{o.name}: {tris(o)} triangles")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=False,
        export_all_vertex_colors=False,
        export_normals=True,
        export_texcoords=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )


main()
