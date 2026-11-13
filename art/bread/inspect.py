"""Imports Pasha's Bakery.glb (SRC) and prints its size and the empties' bounding boxes
(each root child of the assembly is one bread or tray), then renders a top view to OUT_DIR."""
import os
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ["SRC"])
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
print("MESHES", len(meshes), "TRIS", sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons))
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
print("BOUNDS", tuple(round(c, 2) for c in lo), tuple(round(c, 2) for c in hi))
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "FLAT"
sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x = 1800
sc.render.resolution_y = 1200
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c"))
cam.data.type = "ORTHO"
cam.data.clip_end = 1000
sc.collection.objects.link(cam)
sc.camera = cam
ctr = (lo + hi) / 2
cam.data.ortho_scale = max(hi.x - lo.x, hi.y - lo.y) * 1.05
# the glTF y-up scene is z-up in Blender: look straight down, then from the front
for name, loc, rot in [
    ("top", ctr + Vector((0, 0, 100)), (0, 0, 0)),
    ("front", ctr + Vector((0, -100, 0)), (1.5708, 0, 0)),
]:
    cam.location = loc
    cam.rotation_euler = rot
    sc.render.filepath = os.path.join(os.environ["OUT_DIR"], name + ".png")
    bpy.ops.render.render(write_still=True)
