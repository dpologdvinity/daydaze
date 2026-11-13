"""Cuts individual baked goods out of Pasha's CC-BY "Bakery" pack (one 36 MB GLB
laying out 2,400 meshes in a grid: trays, baskets, pies, cupcakes) and writes
each as a small GLB for the game.

For every item below, the meshes whose centers fall inside its box of the pack's
top view are joined, set on y = 0 centered on x and z, and decimated to about
TRIS triangles. `box` is in pixels of the 1800x1200 top-view render that
art/bread/inspect.py makes (214 px per meter); the pack's labels are not in
the meshes, so there is nothing to strip.

    SRC=<Bakery.glb> OUT_DIR=<dir> [ONLY=name,name] [PREVIEW=<dir>] \\
    blender --background --factory-startup --python art/bread/build_bread.py

Then, per file: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb \\
      --compress meshopt --texture-compress webp --texture-size 512
"""

import os

import bpy
from mathutils import Vector

# the top-view render's framing: world centre and meters per pixel
CX, CY, MPP = 4.12, 1.92, 8.4 / 1800


def at_px(px, py):
    return Vector((CX + (px - 900) * MPP, CY - (py - 600) * MPP))


# name: (box x0, y0, x1, y1 in top-view pixels, target triangles)
ITEMS = {
    "croissants": ((152, 712, 248, 832), 2600),
    "buns": ((50, 712, 148, 832), 2600),
    "rolls": ((248, 712, 342, 832), 2600),
    "cookies": ((66, 392, 166, 510), 2200),
    "donuts": ((665, 310, 762, 425), 2600),
    "baguettes": ((962, 838, 1112, 938), 2400),
    "tart-choc": ((728, 598, 792, 662), 700),
    "cake-strawberry": ((798, 598, 862, 662), 700),
    "pie-berry": ((861, 598, 925, 662), 700),
    "tart-fruit": ((925, 598, 989, 662), 700),
    "pie-cream": ((1283, 598, 1347, 662), 700),
    "pie-lattice": ((1485, 598, 1549, 662), 700),
}

ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ["SRC"])
every = [o for o in bpy.data.objects if o.type == "MESH"]
centers = {o.name: sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8 for o in every}

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x = sc.render.resolution_y = 320
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c"))
cam.data.clip_end = 100
sc.collection.objects.link(cam)
sc.camera = cam

for name, ((x0, y0, x1, y1), target) in ITEMS.items():
    if ONLY and name not in ONLY:
        continue
    lo, hi = at_px(x0, y1), at_px(x1, y0)
    picked = [o for o in every if lo.x <= centers[o.name].x <= hi.x and lo.y <= centers[o.name].y <= hi.y]
    # copies, so the pack stays whole for the next item
    bpy.ops.object.select_all(action="DESELECT")
    copies = []
    for o in picked:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        mw = o.matrix_world.copy()
        c.parent = None
        c.matrix_world = mw
        c.select_set(True)
        copies.append(c)
    if not copies:
        print("ITEM", name, "nothing in", (x0, y0, x1, y1))
        continue
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(copies) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    tri = ob.modifiers.new("tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)
    now = len(ob.data.polygons)
    if now > target:
        dec = ob.modifiers.new("dec", "DECIMATE")
        dec.ratio = target / now
        bpy.ops.object.modifier_apply(modifier=dec.name)
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p[i] for p in pts) for i in range(3)))
    mx = Vector((max(p[i] for p in pts) for i in range(3)))
    ob.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    bpy.ops.object.transform_apply(location=True)
    ob.name = name
    size = mx - mn
    print(f"ITEM {name} parts={len(picked)} from={now} to={len(ob.data.polygons)} size={size.x:.2f}x{size.y:.2f}x{size.z:.2f} mats={len(ob.data.materials)}")
    # export just this object
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(os.environ["OUT_DIR"], name + ".glb"),
        export_format="GLB",
        use_selection=True,
    )
    if os.environ.get("PREVIEW"):
        d = max(size.x, size.y, size.z)
        cam.location = Vector((0, 0, size.z / 2)) + Vector((1, -1.2, 0.9)).normalized() * d * 2.4
        cam.rotation_euler = (Vector((0, 0, size.z / 2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(os.environ["PREVIEW"], name + ".png")
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(ob, do_unlink=True)
