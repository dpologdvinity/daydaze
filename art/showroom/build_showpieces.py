"""The Dealership's two showpieces, built from CC-BY downloads and stripped of
every logo, badge and wordmark.

  CAR=saloon   Fishboe's "Jaguar/Daimler XJ X308 Pack" (CC-BY): the XJ Sport
               variant only. The pack's badge materials (leaper, V8, model name,
               hub caps) are reassigned to plain chrome and the JAGUAR plates in
               the "Details" texture are painted out. In-game it is the made-up
               "Aurelia Grand Saloon".
  CAR=concept  3DHaupt's "Future Car" (CC-BY): body, wheels and canopy, the
               display plate dropped. Its sci-fi greeble texture has no text.
               In-game it is the made-up "Comet Zero".

Each is decimated, joined to one object per material, turned so it faces +z
(glTF), centered on x and z, set on y = 0 and scaled to a showroom length.

    CAR=saloon BLEND=<X308Pack.blend> TEXTURES=<textures dir> OUT=<out .glb> \\
    blender --background --factory-startup --python art/showroom/build_showpieces.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \\
      --texture-compress webp --texture-size 1024
"""

import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

CAR = os.environ["CAR"]
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
bpy.ops.file.find_missing_files(directory=os.environ["TEXTURES"])

if CAR == "saloon":
    keep = lambda o: o.name.startswith("XJSport_")
    # decimate ratio by part: body, interior, wheels, brake calipers
    ratio = lambda o: 0.35 if o.name.endswith("Body") else 0.25 if "Interior" in o.name else 0.15 if "Wheel" in o.name else 1.0
    LENGTH = 4.9
    turn = Matrix.Identity(4)  # nose already on -y (glTF +z)
else:
    keep = lambda o: o.name in ("Cube.044", "Cube.045", "Speed_car.000", "Speed_car.007")
    ratio = lambda o: 0.12 if o.name == "Speed_car.007" else 0.06 if o.name.startswith(("Cube.044", "Speed_car.000")) else 1.0
    LENGTH = 4.6
    # the nose is on -x: a quarter turn about z puts it on -y (glTF +z)
    turn = Matrix.Rotation(math.pi / 2, 4, "Z")

for o in list(bpy.data.objects):
    if o.type != "MESH" or not keep(o):
        bpy.data.objects.remove(o, do_unlink=True)

if CAR == "saloon":
    # the JAGUAR plates in the Details texture (its lower half): painted dark
    details = bpy.data.materials["Details"]
    img = next(n.image for n in details.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
    W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    px[: int(H * (1 - 0.53)), :, 0:3] = 0.05  # rows run bottom-up: the bottom 47%
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.pack()

parts = [o for o in bpy.data.objects if o.type == "MESH"]
for o in parts:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

for o in parts:
    if CAR == "saloon":
        # badge materials become the object's chrome: no leaper, V8, model name or hub logo
        slots = [m.name if m else "" for m in o.material_slots]
        chrome = next((i for i, n in enumerate(slots) if n == "Chrome"), None)
        if chrome is not None:
            bad = {i for i, n in enumerate(slots) if "Badg" in n}
            for p in o.data.polygons:
                if p.material_index in bad:
                    p.material_index = chrome
    bpy.context.view_layer.objects.active = o
    tri = o.modifiers.new("tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)
    r = ratio(o)
    if r < 1.0:
        dec = o.modifiers.new("dec", "DECIMATE")
        dec.ratio = r
        bpy.ops.object.modifier_apply(modifier=dec.name)

bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
car = bpy.context.view_layer.objects.active
car.data.transform(turn @ car.matrix_world)
car.matrix_world.identity()
# drop material slots no face uses (the removed badges and plates)
bpy.ops.object.material_slot_remove_unused()

pts = [Vector(c) for c in (v.co for v in car.data.vertices)]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
k = LENGTH / (hi.y - lo.y)
shift = Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))
car.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(shift))
car.name = CAR
print("TRIS", sum(len(p.vertices) - 2 for p in car.data.polygons), "MATS", [m.name for m in car.data.materials])
print("SIZE", tuple(round((hi - lo)[i] * k, 2) for i in (0, 2, 1)))
bpy.ops.export_scene.gltf(filepath=os.environ["OUT"], export_format="GLB")
