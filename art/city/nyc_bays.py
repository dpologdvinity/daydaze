"""Builds the NYC facade "bays" from Quaternius' Downtown City MegaKit (CC0).

    KIT="/tmp/daydaze-city/megakit/Exports/glTF (Godot)" \
      blender --background --factory-startup --python art/city/nyc_bays.py \
      -- /tmp/nyc-bays.glb

A bay is one storey of a facade: 4 m wide, 3 m tall, front plane at z = 0, out
toward +z, centered on x = 0, bottom at y = 0. Each is a few kit modules
merged into one mesh, with the kit's hidden interior-wall faces dropped, then
thinned (planar dissolve, then collapse) to a few dozen triangles so a street
of them fits the city's draw budget. The client draws every bay kind as one
InstancedMesh (src/client/city/NycFacades.tsx).

The kit's textures are not used. Each face carries a flat vertex color and
two flags in TEXCOORD_0, which the client's shader reads:
  u = glass (1 for windows: dark, lit at night by the shader)
  v = brick (1 where the instance tint and the brick photo apply; 0 for
      stone, metal and trim, which keep their own color)
Run `scripts/import-nyc.sh` to optimize the output into public/models/nyc/.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

KIT = os.environ.get("KIT", "/tmp/daydaze-city/megakit/Exports/glTF (Godot)")
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/nyc-bays.glb"
PREVIEW = os.environ.get("PREVIEW")  # path of a PNG to render the lineup to

# kit material -> (r, g, b, glass, brick); linear colors. Brick is white so
# the instance tint and the brick photo carry it. None drops the faces.
MATERIALS = {
    "MI_RedBrick": (1.0, 1.0, 1.0, 0, 1),
    "MI_RedBrick_Pale": (1.0, 0.94, 0.88, 0, 1),
    "MI_Trim": (0.62, 0.58, 0.5, 0, 0),
    "MI_Trim_Dark": (0.05, 0.05, 0.06, 0, 0),
    "MI_Trim_Green": (0.03, 0.16, 0.1, 0, 0),
    "MI_Trim_MetalConcrete": (0.07, 0.075, 0.085, 0, 0),
    "MI_Concrete": (0.35, 0.35, 0.34, 0, 0),
    "MI_Glass": (0.015, 0.025, 0.05, 1, 0),
    "MI_FakeInterior": (0.02, 0.02, 0.035, 1, 0),
    "MI_FakeInterior_1": (0.02, 0.02, 0.035, 1, 0),
    "MI_FakeInterior_2": (0.02, 0.02, 0.035, 1, 0),
    "MI_FakeInterior_3": (0.02, 0.02, 0.035, 1, 0),
    "MI_FakeInterior_4": (0.02, 0.02, 0.035, 1, 0),
    "MI_Ornaments": (0.4, 0.4, 0.4, 0, 0),
    "MI_Dirt": (0.06, 0.04, 0.03, 0, 0),
    "MI_InteriorWall": None,
    "MI_InteriorFloor": None,
}

# prefab -> [(module, x, y, z, yaw degrees)] in glTF axes (x along the wall,
# y up, z out of it)
PREFABS = {
    "winA": [("Brick_Inset_Window", 0, 0, 0, 0)],
    "winB": [("Brick_RedWhite_DoubleWindow", 0, 0, 0, 0)],
    "winC": [("Brick_Window_CurvedDouble", 0, 0, 0, 0)],
    "winD": [("Metal_Window", 0, 0, 0, 0)],
    "winE": [
        ("Brick_Window_Square_Single", -1, 0, 0, 0),
        ("Brick_Window_Square_Single", 1, 0, 0, 0),
    ],
    "winF": [
        ("Brick_Window_Trim_Single", -1, 0, 0, 0),
        ("Brick_Window_Trim_Single", 1, 0, 0, 0),
    ],
    "blank": [("Brick_Plain_3", -1, 0, 0, 0), ("Brick_Plain_3", 1, 0, 0, 0)],
    "shopA": [
        ("Metal_FirstFloor_Window", -1, 0, 0, 0),
        ("Metal_FirstFloor_Window", 1, 0, 0, 0),
    ],
    "shopB": [
        ("Trim_FirstFloor_Window_001", -1, 0, 0, 0),
        ("Trim_FirstFloor_Window_001", 1, 0, 0, 0),
        ("Trim_FirstFloor_Window_Columns", -1, 0, 0, 0),
        ("Trim_FirstFloor_Window_Columns", 1, 0, 0, 0),
    ],
    "shopW": [
        ("Metal_FirstFloor_Wall", -1, 0, 0, 0),
        ("Metal_FirstFloor_Wall", 1, 0, 0, 0),
    ],
    "doorA": [
        ("DoorFrame_Trim", -1, 0, 0, 0),
        ("Trim_FirstFloor_Window_001", 1, 0, 0, 0),
    ],
    "doorB": [
        ("DoorFrame_Wooden", 0, 0, 0, 0),
        ("Brick_Column_Small", -1.75, 0, 0, 0),
        ("Brick_Column_Small", 1.75, 0, 0, 0),
    ],
    "stoop": [
        ("Stairs_Entrance_Concrete", 0, 0, 0, 0),
        ("Stairs_Rails_Metal", -1, 0, 0, 0),
        ("Stairs_Rails_Metal", 1, 0, 0, 0),
    ],
    "corniceT": [("Cornice_Trim_Center", -1, 0, 0, 0), ("Cornice_Trim_Center", 1, 0, 0, 0)],
    "corniceB": [("Cornice_Brick_Center", -1, 0, 0, 0), ("Cornice_Brick_Center", 1, 0, 0, 0)],
    "corniceM": [("Cornice_Metal_Center", -1, 0, 0, 0), ("Cornice_Metal_Center", 1, 0, 0, 0)],
    "post": [("Brick_CornerColumn_Center", 0, 0, 0, 0)],
    "postCap": [("Brick_CornerColumn_Cap", 0, -2, 0, 0)],
    "ac": [("Prop_ACUnit", 0, 0, 0, 0)],
}
# a bay is 4 m, the posts and the AC unit are narrower
STONE = (0.62, 0.58, 0.5, 0, 0)
IRON = (0.04, 0.04, 0.045, 0, 0)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_module(name):
    """The kit module's meshes, joined into one object with no parents."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, name + ".gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        o.parent = None
        o.matrix_world = o.matrix_world  # keep the world transform
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


def paint(obj, override=None):
    """Drop the hidden faces; give every corner its color and glass/brick flags."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    mats = [m.name.split(".")[0] if m else "" for m in obj.data.materials]
    drop = [
        f
        for f in bm.faces
        if f.material_index < len(mats) and MATERIALS.get(mats[f.material_index], 0) is None
    ]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    col = bm.loops.layers.float_color.new("Col")
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        key = mats[f.material_index] if f.material_index < len(mats) else ""
        r, g, b, glass, brick = override or MATERIALS.get(key, STONE)
        for loop in f.loops:
            loop[col] = (r, g, b, 1.0)
            loop[uv].uv = (glass, brick)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.materials.clear()
    for layer in list(obj.data.uv_layers)[:-1]:
        obj.data.uv_layers.remove(layer)


def thin(obj, collapse):
    """Planar dissolve (drops brick and ornament detail on flat faces), then collapse."""
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("dissolve", "DECIMATE")
    mod.decimate_type = "DISSOLVE"
    mod.angle_limit = math.radians(6)
    mod.delimit = {"MATERIAL", "UV"}
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new("collapse", "DECIMATE")
    mod.ratio = collapse
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def build(name, parts, collapse):
    """One prefab: its modules placed (glTF axes), merged, painted and thinned."""
    pieces = []
    for module, x, y, z, yaw in parts:
        obj = import_module(module)
        paint(obj)
        # glTF (x, y up, z out) is Blender (x, -z, y)
        obj.location = Vector((x, -z, y))
        obj.rotation_euler = (0, 0, math.radians(yaw))
        pieces.append(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for o in pieces:
        o.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(pieces) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    before = tris(obj)
    thin(obj, collapse)
    print(f"{name}: {before} -> {tris(obj)} triangles")
    return obj


def fire_escape():
    """One storey of fire escape from Poly Haven's Modular Fire Escape (CC0):
    its landing slab and the railing that stands on it, squeezed to fit a 4 m
    bay, painted iron black and thinned. Wall side at y = 0, sticking out 1.4 m."""
    path = os.environ.get("FIRE_ESCAPE", "/tmp/nyc-fe/modular_fire_escape_1k.gltf")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    keep = {}
    for o in new:
        if o.type == "MESH" and o.name.endswith(("platform_middle", "railing_middle")):
            keep[o.name.rsplit("_", 2)[-2]] = o
    slab, rail = keep["platform"], keep["railing"]
    for o in new:
        if o not in (slab, rail) and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in (slab, rail):
        o.parent = None
    bpy.ops.object.select_all(action="DESELECT")
    for o in (slab, rail):
        o.select_set(True)
    bpy.context.view_layer.objects.active = slab
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # the rail stands one storey-gap above the slab in the kit; seat it on it
    rail.location.z -= 1.0
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in (slab, rail):
        paint(o, override=(*IRON[:3], 0, 0))
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    # the kit's Z is up already: bottom at 0, wall edge at y = 0, narrower
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    obj.location = (-(max(xs) + min(xs)) / 2, -max(ys), -min(zs))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.scale = (0.8, 1.0, 1.0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.name = "fireEscape"
    obj.data.name = "fireEscape"
    before_tris = tris(obj)
    thin(obj, 0.1)
    print(f"fireEscape: {before_tris} -> {tris(obj)} triangles")
    return obj


def main():
    clear()
    # collapse ratios: busy modules go lower; windows keep their recess
    ratio = {
        "winA": 0.3, "winB": 0.12, "winC": 0.1, "winD": 0.2, "winE": 0.3,
        "winF": 0.15, "blank": 1.0, "shopA": 0.5, "shopB": 0.4, "shopW": 1.0,
        "doorA": 0.2, "doorB": 0.2, "stoop": 0.25, "corniceT": 0.2,
        "corniceB": 1.0, "corniceM": 0.4, "post": 1.0, "postCap": 0.3, "ac": 0.3,
    }
    objs = [build(n, p, ratio[n]) for n, p in PREFABS.items()]
    objs.append(fire_escape())
    for o in objs:
        attrs = o.data.color_attributes
        attrs.active_color = attrs["Col"]
        attrs.render_color_index = attrs.find("Col")
    if PREVIEW:
        for i, o in enumerate(objs):
            o.location.x += (i % 7) * 5.0
            o.location.z -= (i // 7) * 5.0
        scene = bpy.context.scene
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "VERTEX"
        scene.render.resolution_x, scene.render.resolution_y = 2100, 1000
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = 32
        cam.location = (15, -30, -2.5)
        cam.rotation_euler = (math.radians(90), 0, 0)
        scene.collection.objects.link(cam)
        scene.camera = cam
        scene.render.filepath = PREVIEW
        bpy.ops.render.render(write_still=True)
        return
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_all_vertex_colors=False,
        export_normals=True,
        export_texcoords=True,
        export_cameras=False,
        export_lights=False,
    )
    print("wrote", OUT)


main()
