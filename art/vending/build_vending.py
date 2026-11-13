"""The vending machine: MadeByYeshe's CC-BY "90s Retro Vending Machine" (334
triangles), turned so its glass front faces +z, scaled to 1.85 m tall, feet on
the ground at the origin. The two-triangle glass pane is dropped (the stock
shows through; the shader would only add a draw call).

    SRC=<vending .glb> OUT=<out .glb> \\
    blender --background --factory-startup --python art/vending/build_vending.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \\
      --texture-compress webp --texture-size 512
"""

import math
import os

import bpy
from mathutils import Matrix, Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
HEIGHT = 1.85

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

for o in [o for o in bpy.data.objects if o.type == "MESH" and any(m.name == "Generic_Glass" for m in o.data.materials)]:
    bpy.data.objects.remove(o)

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
# the source's front faces Blender +x; glTF +z is Blender -y
turn = Matrix.Rotation(-math.pi / 2, 4, "Z")
pts = [turn @ o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
k = HEIGHT / (hi.z - lo.z)
# center on x and y, feet on z = 0, scaled
fix = Matrix.Scale(k, 4) @ Matrix.Translation(Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))) @ turn
for o in meshes:
    o.parent = None
    o.data.transform(fix @ o.matrix_world)
    o.matrix_world.identity()
for o in [o for o in bpy.data.objects if o.type != "MESH"]:
    bpy.data.objects.remove(o)
print("TRIS", sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons))
print("SIZE", tuple(round((hi - lo)[i] * k, 3) for i in range(3)))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")
