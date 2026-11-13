"""Builds the district lot models from Quaternius' Ultimate Textured Building
Pack (CC0): the finished 1 to 6 storey buildings, each joined into one mesh,
scaled to meters (a standard 2 storey lot is 5.6 m wide), front toward +z,
standing on y = 0 with the front plane at z = 0 and the body behind it,
thinned to a few hundred to a thousand triangles so a street of them fits the
city's draw budget.

    KIT="/tmp/db-kit/Ultimate Textured Building Pack - Dec 2019" \
      flock /tmp/daydaze-blender.lock nice -n 19 blender --background \
      --factory-startup --python art/city/district_blocks.py -- /tmp/lots.glb

`bash scripts/import-districts.sh` runs this and compresses the result into
public/models/districts/lots.glb. Colors are not baked in: the pack paints
with a 32 px palette (4 by 4 swatches, one per role: wall, trim, roof, door,
glass...) and every model keeps its UVs into it. The client swaps in its own
palettes (src/game/city/districts.ts, src/client/city/DistrictLots.tsx), so
one model wears every district's colors.

PREVIEW=/path.png renders a lineup of the thinned models with a debug palette
(each swatch a different hue), to see which swatch lands where.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

KIT = os.environ.get("KIT", "/tmp/db-kit/Ultimate Textured Building Pack - Dec 2019")
FBX = os.path.join(KIT, "Textured Models", "Finished Textured Buildings", "FBX")
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/lots.glb"
PREVIEW = os.environ.get("PREVIEW")

#: loose parts under DROP_BELOW model units are left out (the pack's 0.6 m
#: quoin and brick blocks); under SMALL_BELOW they are collapsed to `ratio`
DROP_BELOW = float(os.environ.get("DROP_BELOW", "0.26"))
SMALL_BELOW = float(os.environ.get("SMALL_BELOW", "0.6"))
#: share of a wall-sized part's faces the collapse keeps
WALL_KEEP = float(os.environ.get("WALL_KEEP", "0.7"))
#: meters per model unit: a standard 2 storey building (2.16 units) is 5.6 m wide
METERS = 5.6 / 2.16
#: meters behind the front wall that the lots keep; a roof band this tall stays whole
BODY_DEPTH = float(os.environ.get("BODY_DEPTH", "1.2"))
ROOF_BAND = float(os.environ.get("ROOF_BAND", "1.5"))
#: the front parapet is measured within this many meters of the front wall
ROOF_DEPTH = 0.6
#: where the pack puts every model's front wall, in model units
WALL_Y = 1.08

# our name -> (pack file, collapse ratio after the planar dissolve)
MODELS = {
    "gable2": ("2Story_GableRoof", 0.3),
    "round2": ("2Story_RoundRoof", 0.5),
    "s2": ("2Story", 0.45),
    "s2bal": ("2Story_Balcony", 0.45),
    "s2col": ("2Story_Columns", 0.45),
    "s2wide": ("2Story_Wide", 0.4),
    "s3bal": ("3Story_Balcony", 0.4),
    "s3slim": ("3Story_Slim", 0.5),
    "s4": ("4Story", 0.35),
    "s4center": ("4Story_Center", 0.35),
    "s6": ("6Story_Stack", 0.35),
}


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def load(stem):
    """The building as one object: meters, Blender axes (x across, y deep, z up)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(FBX, stem + ".fbx"))
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


def thin(obj, ratio, wall=None, drop=None):
    """Weld, then thin each loose part on its own: the pack builds a facade
    out of 150 to 250 small closed shells (stone blocks, sills, bricks, window
    frames), and collapsing the whole mesh at once tears them into shards.
    Parts too small to see from the street are dropped, window-sized ones are
    collapsed to a few faces, walls and roof only lightly. `ratio` is how much
    of a window-sized part is kept, `wall` (default WALL_KEEP) how much of a
    wall-sized one."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    top = max(max(v.co.z for v in o.data.vertices) for o in parts)
    keep = []
    for part in parts:
        t = tris(part)
        size = max(part.dimensions)  # model units
        if size < (drop or DROP_BELOW):
            bpy.data.objects.remove(part, do_unlink=True)
            continue
        zmax = max(v.co.z for v in part.data.vertices)
        if size < SMALL_BELOW and zmax < top - ROOF_BAND / METERS:
            front_only(part)
            t = tris(part)
            if t == 0:
                bpy.data.objects.remove(part, do_unlink=True)
                continue
        if t > 14:
            want = ratio if size < SMALL_BELOW else (wall or WALL_KEEP)
            mod = part.modifiers.new("collapse", "DECIMATE")
            mod.ratio = max(want, 12.0 / t)
            bpy.context.view_layer.objects.active = part
            bpy.ops.object.modifier_apply(modifier=mod.name)
        keep.append(part)
    bpy.ops.object.select_all(action="DESELECT")
    for part in keep:
        part.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    bm = bmesh.new()
    bm.from_mesh(joined.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(joined.data)
    bm.free()
    # flat faces: collapsed parts keep no meaningful smooth normals
    for poly in joined.data.polygons:
        poly.use_smooth = False
    return joined


def snap_uvs(obj):
    """Every face to the center of its palette swatch: the collapse blends UVs
    across swatch borders, and the client swaps the palette by swatch."""
    uv = obj.data.uv_layers.active.data
    for poly in obj.data.polygons:
        loops = poly.loop_indices
        u = sum(uv[i].uv[0] for i in loops) / len(loops)
        v = sum(uv[i].uv[1] for i in loops) / len(loops)
        col = min(3, max(0, int(u * 4)))
        row = min(3, max(0, int((1 - v) * 4)))
        for i in loops:
            uv[i].uv = ((col + 0.5) / 4, 1 - (row + 0.5) / 4)


def front_only(part):
    """A stone block, sill or window frame seen from the street shows only its
    front: keep the faces that look toward the viewer (-y) and drop the sides,
    top, bottom and back."""
    bm = bmesh.new()
    bm.from_mesh(part.data)
    bmesh.ops.delete(
        bm, geom=[f for f in bm.faces if f.normal.y > -0.3], context="FACES"
    )
    bm.to_mesh(part.data)
    bm.free()


def place(obj):
    """Scale to meters, centered on x, standing on z = 0, the front wall (the
    pack's y = -1.08, shared by every model) at y = 0 and the body behind it;
    steps, balconies and awnings stand in front of that plane (y < 0)."""
    obj.scale = (METERS, METERS, METERS)
    bpy.ops.object.transform_apply(scale=True)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    # the pack faces -y (Blender's front); glTF's +z is Blender's -y, so the
    # body runs to +y, behind the wall plane
    for v in obj.data.vertices:
        v.co.x -= (max(xs) + min(xs)) / 2
        v.co.y += WALL_Y * METERS
        v.co.z -= min(zs)


def cut_hidden(obj):
    """Drops what no one sees: the box behind each lot hides the body, so
    wall and floor faces deeper than `BODY_DEPTH` meters behind the front wall
    go, and so do faces that face down and sit that deep. Roof-level faces
    (parapet, AC units, pipes, chimneys) stay at any depth: they are the
    skyline."""
    top = max(v.co.z for v in obj.data.vertices)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = [
        f
        for f in bm.faces
        if f.calc_center_median().y > BODY_DEPTH
        and f.calc_center_median().z < top - ROOF_BAND
    ]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()


def debug_palette():
    """A 32 px palette whose 16 swatches are distinct hues (for the lineup)."""
    img = bpy.data.images.new("debug", 32, 32)
    px = []
    for y in range(32):
        for x in range(32):
            i = (3 - y // 8) * 4 + x // 8  # image rows run bottom to top
            r, g, b = hsv(i / 16.0)
            px += [r, g, b, 1.0]
    img.pixels = px
    img.pack()
    return img


def hsv(h):
    import colorsys

    return colorsys.hsv_to_rgb(h, 0.8, 0.9)


def material(name, image):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    if image:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Closest"
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def render_lineup(objs):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = False
    scene.render.resolution_x, scene.render.resolution_y = 2400, 900
    x = 0
    for o in objs:
        w = max(v.co.x for v in o.data.vertices) - min(v.co.x for v in o.data.vertices)
        o.location.x = x + w / 2
        x += w + 2.5
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = x * 0.62
    # looking from the front (-y), a little from the right and above
    cam.location = (x * 0.5 + 12, -60, 14)
    cam.rotation_euler = (math.radians(80), 0, math.radians(12))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)


#: the far twin of each lot (name_lo): window-sized parts collapsed to a few
#: faces and walls to a third, for the band past LOT_NEAR in districts.ts
LOW_RATIO = 0.3
LOW_WALL = 0.3
LOW_DROP = float(os.environ.get("LOW_DROP", "0.42"))


def build(name, stem, ratio, wall, mat, objs, drop=None):
    obj = load(stem)
    before = tris(obj)
    obj = thin(obj, ratio, wall, drop)
    place(obj)
    cut_hidden(obj)
    snap_uvs(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.name = obj.data.name = name
    dims = obj.dimensions
    # the roofline at the front wall: the parapet, below the AC units and
    # chimneys that stand deeper on the roof
    roof = max(v.co.z for v in obj.data.vertices if v.co.y < ROOF_DEPTH)
    print(
        f"SPEC {name} w={dims.x:.2f} h={dims.z:.2f} roof={roof:.2f}"
        f" tris={tris(obj)} (from {before})"
    )
    objs.append(obj)


def main():
    clear()
    objs = []
    dbg = debug_palette() if PREVIEW else None
    mat = material("palette", dbg)
    for name, (stem, ratio) in MODELS.items():
        build(name, stem, ratio, None, mat, objs)
        build(name + "_lo", stem, ratio * LOW_RATIO, LOW_WALL, mat, objs, LOW_DROP)
    if PREVIEW:
        render_lineup(objs)
        return
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )


main()
