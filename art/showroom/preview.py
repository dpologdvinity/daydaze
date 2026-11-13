"""Workbench previews (3/4, side, front) of a .blend's visible meshes: BLEND, OUT_DIR, optional HIDE=name,name, KEEP=prefix, TEXTURES=dir."""
import math, os
import bpy
from mathutils import Vector

bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
hide = set(filter(None, os.environ.get("HIDE", "").split(",")))
keep = os.environ.get("KEEP")  # an object-name prefix: everything else is hidden
if keep:
    hide |= {o.name for o in bpy.data.objects if not o.name.startswith(keep)}
bpy.ops.file.find_missing_files(directory=os.environ.get("TEXTURES", ""))
for o in bpy.data.objects:
    if o.name in hide:
        o.hide_render = True
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x = sc.render.resolution_y = 500
ms = [o for o in bpy.data.objects if o.type == "MESH" and not o.hide_render and not o.hide_viewport and o.name not in hide]
pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
ctr = (lo + hi) / 2
size = (hi - lo).length
print("BOUNDS", tuple(round(c, 2) for c in lo), tuple(round(c, 2) for c in hi))
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c"))
cam.data.clip_end = 10000
sc.collection.objects.link(cam)
sc.camera = cam
for name, d in [("q", Vector((1, -1, 0.5))), ("side", Vector((0, -1, 0.1))), ("front", Vector((1, 0, 0.1)))]:
    cam.location = ctr + d.normalized() * size * 1.4
    cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(os.environ["OUT_DIR"], name + ".png")
    bpy.ops.render.render(write_still=True)
