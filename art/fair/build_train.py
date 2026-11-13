"""Builds the Amusement Park's kiddie train from Quaternius' Train Pack (CC0).

    TRAINS="<unzipped>/Train Pack - April 2019/FBX" \
      blender --background --factory-startup --python art/fair/build_train.py -- /tmp/kiddie

Writes kiddie-engine.glb (the steam locomotive), kiddie-tender.glb and
kiddie-wagon.glb (the passenger car with its roof cut off, so a rider shows
over the sides), each thinned to a third of its triangles and recolored in the
midway's candy palette (every material's color baked into vertex colors, so a
car is one plain material). Cars lie along +z, the engine's nose to +z, wheels
on y = 0, centered on x = z = 0, at the pack's own size (8 m long): the client
scales them down. `PREVIEW_DIR=<dir>` also renders a 3/4 view of each car.
Run `scripts/import-train.sh` to optimize them into public/models/fair/.
"""

import math
import os
import sys

import bmesh
import bpy

TRAINS = os.environ["TRAINS"]
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/kiddie"
PREVIEW = os.environ.get("PREVIEW_DIR")
os.makedirs(OUT, exist_ok=True)


def srgb(hex_color):
    """#rrggbb -> linear RGB, the space glTF vertex colors are in."""
    c = [int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


# (part, material) -> candy color; anything else keeps a dark rubber
PALETTE = {
    "engine": {"Grey": "#ff2f9a", "Black": "#4a1f7a"},
    "tender": {"Grey": "#3fe0d0", "Black": "#3a1a66"},
    # near white: the client tints each wagon its own candy color
    "wagon": {
        "LightWood": "#ffe9b0",
        "Green": "#ffffff",
        "DarkGreen": "#e4e0f2",
        "Windows": "#2a1245",
        "Grey": "#d9d2ee",
        "Red": "#ffd0e6",
    },
}
WHEELS = {"Black": "#1c0d2e", "Grey": "#ffb02e"}
# the wagon's roof begins above this height (m, pack scale)
ROOF = 2.25


def add_box(bm, layer, lo, hi, hex_color):
    """A colored box from corner `lo` to corner `hi` (Blender axes, pack scale)."""
    r, g, b = srgb(hex_color)
    made = bmesh.ops.create_cube(bm, size=1.0)
    for v in made["verts"]:
        v.co.x = lo[0] if v.co.x < 0 else hi[0]
        v.co.y = lo[1] if v.co.y < 0 else hi[1]
        v.co.z = lo[2] if v.co.z < 0 else hi[2]
    for f in {f for v in made["verts"] for f in v.link_faces}:
        for loop in f.loops:
            loop[layer] = (r, g, b, 1.0)


def open_top(obj):
    """Cuts the wagon off at ROOF, gives its walls a thickness (so they show from
    inside), and furnishes it with a floor and a bench for the rider."""
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=(0, 0, ROOF),
        plane_no=(0, 0, 1),
        clear_outer=True,
    )
    bm.to_mesh(mesh)
    bm.free()
    mod = obj.modifiers.new("walls", "SOLIDIFY")
    mod.thickness = 0.09
    mod.offset = -1
    mod.use_rim = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    layer = bm.loops.layers.float_color["Col"]
    # the inside of the body, between its walls, above its wheels
    body = [v.co for v in bm.verts if 0.7 < v.co.z < 2.0]
    lo_x, hi_x = min(v.x for v in body) + 0.15, max(v.x for v in body) - 0.15
    lo_y, hi_y = min(v.y for v in body) + 0.15, max(v.y for v in body) - 0.15
    add_box(bm, layer, (lo_x, lo_y, 0.5), (hi_x, hi_y, 0.62), "#ffe9b0")
    mid = (lo_x + hi_x) / 2
    add_box(bm, layer, (mid - 0.7, lo_y, 0.62), (mid + 0.7, hi_y, 0.98), "#ffffff")
    bm.to_mesh(mesh)
    bm.free()


def build(part, source):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(TRAINS, source + ".fbx"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        layer = bm.loops.layers.float_color.new("Col")
        palette = WHEELS if "Wheels" in o.name else PALETTE[part]
        for f in bm.faces:
            slot = o.data.materials[f.material_index] if o.data.materials else None
            hex_color = palette.get(slot.name.split(".")[0] if slot else "", "#2a1245")
            r, g, b = srgb(hex_color)
            for loop in f.loops:
                loop[layer] = (r, g, b, 1.0)
        bm.to_mesh(o.data)
        bm.free()
        o.data.materials.clear()
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    mesh = obj.data
    if part == "wagon":
        open_top(obj)
    # the pack's nose points to -x; the ride's cars run along +z (Blender -y)
    obj.rotation_euler = (0, 0, math.pi / 2)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ys = [v.co.y for v in mesh.vertices]
    obj.location.y = -(max(ys) + min(ys)) / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mod = obj.modifiers.new("collapse", "DECIMATE")
    mod.ratio = 0.35 if part != "wagon" else 0.6
    bpy.ops.object.modifier_apply(modifier=mod.name)
    attrs = mesh.color_attributes
    attrs.active_color = attrs["Col"]
    attrs.render_color_index = attrs.find("Col")
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    print(f"kiddie-{part}: {tris} triangles")
    if PREVIEW:
        preview(obj, part)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f"kiddie-{part}.glb"),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_cameras=False,
        export_lights=False,
    )


def preview(obj, part):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "VERTEX"
    sc.render.resolution_x = sc.render.resolution_y = 500
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.location = (7, -7, 5)
    from mathutils import Vector

    cam.rotation_euler = (Vector((0, 0, 1.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(PREVIEW, f"{part}.png")
    bpy.ops.render.render(write_still=True)


build("engine", "Locomotive_Front")
build("tender", "Locomotive_CoalTender")
build("wagon", "Locomotive_PassengerWagon")
