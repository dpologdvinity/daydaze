"""The butterfly: LasquetiSpice's CC-BY monarch ("Animated flying fluttering
butterfly"), frozen in its rest pose, decimated and normalized for instancing.

The skinned 9k-triangle source is read in its rest pose (wings open), joined to
one mesh, collapsed to about 160 triangles with its UVs, turned so the wings
spread along x and the head points to +z, and scaled to a wingspan of 1 m about
the origin. The client flaps it in a vertex shader (wing tips lift with |x|)
and scales each instance to its size. The wing texture is kept (resized by
gltf-transform afterwards).

    SRC=<butterfly .glb> OUT=<out .glb> \\
    blender --background --factory-startup --python art/butterfly/build_butterfly.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \\
      --texture-compress webp --texture-size 256
"""

import os

import bpy
from mathutils import Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
TARGET_TRIS = int(os.environ.get("TRIS", "160"))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

# rest pose, so the skin modifier evaluates to the open-winged mesh
for arm in [o for o in bpy.data.objects if o.type == "ARMATURE"]:
    arm.data.pose_position = "REST"
bpy.context.view_layer.update()

# the source also carries a stray untextured icosphere: keep the skinned mesh only
meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.data.polygons and o.data.materials]
dg = bpy.context.evaluated_depsgraph_get()
baked = []
for o in meshes:
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    ob = bpy.data.objects.new(o.name + "-baked", me)
    ob.matrix_world = o.matrix_world
    bpy.context.collection.objects.link(ob)
    baked.append(ob)
for o in list(bpy.data.objects):
    if o not in baked:
        bpy.data.objects.remove(o)

bpy.ops.object.select_all(action="DESELECT")
for o in baked:
    o.select_set(True)
bpy.context.view_layer.objects.active = baked[0]
bpy.ops.object.join()
obj = bpy.context.active_object
# bake the world transform (the source nests the mesh under a 0.01 root)
me = obj.data
me.transform(obj.matrix_world)
obj.matrix_world.identity()

# triangulate, then collapse
bpy.ops.object.mode_set(mode="OBJECT")
tri = obj.modifiers.new("tri", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=tri.name)
now = len(obj.data.polygons)
dec = obj.modifiers.new("dec", "DECIMATE")
dec.ratio = min(1.0, TARGET_TRIS / now)
bpy.ops.object.modifier_apply(modifier=dec.name)

# the source is already wings along x, body along y, up along z (Blender axes,
# so the exported glTF has x = span, y up, body along z); center it and scale
# the wingspan to 1 m
verts = [v.co.copy() for v in obj.data.vertices]
lo = Vector((min(v[i] for v in verts) for i in range(3)))
hi = Vector((max(v[i] for v in verts) for i in range(3)))
print("EXTENT", tuple(round(c, 4) for c in (hi - lo)))
k = 1.0 / (hi.x - lo.x)
for v in obj.data.vertices:
    v.co = (v.co - (lo + hi) / 2) * k
obj.data.update()
obj.name = "butterfly"
print("TRIS", sum(len(p.vertices) - 2 for p in obj.data.polygons))
print("MATS", [m.name for m in obj.data.materials])

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=False)
