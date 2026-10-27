"""Builds the El's train cars from Quaternius' Train Pack (CC0).

    TRAINS="/tmp/daydaze-city/q/Train_Pack__April_2019/Train Pack - April 2019/FBX" \
      blender --background --factory-startup --python art/city/el_train.py -- /tmp/el

Writes train-front.glb (the nose points to +x) and train-wagon.glb, each
thinned to a third of its triangles, with every material's color baked into
vertex colors so the client draws a car with one plain material. Cars are 12 m
long, 2 m wide and 1.9 m tall, wheels on y = 0, centered on x = 0.
Run `scripts/import-nyc.sh` to optimize them into public/models/el/.
"""

import math
import os
import sys

import bmesh
import bpy

TRAINS = os.environ.get(
    "TRAINS", "/tmp/daydaze-city/q/Train_Pack__April_2019/Train Pack - April 2019/FBX"
)
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/el"
os.makedirs(OUT, exist_ok=True)


def car(name, nose_to_plus_x):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(TRAINS, name + ".fbx"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    mesh = obj.data
    colors = {}
    for i, slot in enumerate(mesh.materials):
        c = (0.5, 0.5, 0.5)
        if slot:
            node = next((n for n in slot.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if node:
                c = tuple(node.inputs["Base Color"].default_value[:3])
        colors[i] = c
    bm = bmesh.new()
    bm.from_mesh(mesh)
    layer = bm.loops.layers.float_color.new("Col")
    for f in bm.faces:
        r, g, b = colors.get(f.material_index, (0.5, 0.5, 0.5))
        for loop in f.loops:
            loop[layer] = (r, g, b, 1.0)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.clear()
    # the kit's nose points to -x on the front car
    if name.endswith("Front") and nose_to_plus_x:
        obj.rotation_euler = (0, 0, math.pi)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    xs = [v.co.x for v in mesh.vertices]
    obj.location.x = -(max(xs) + min(xs)) / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mod = obj.modifiers.new("collapse", "DECIMATE")
    mod.ratio = 0.3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    attrs = mesh.color_attributes
    attrs.active_color = attrs["Col"]
    attrs.render_color_index = attrs.find("Col")
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    print(f"{name}: {tris} triangles")
    out = os.path.join(OUT, {"HighSpeed_Front": "train-front", "HighSpeed_Wagon": "train-wagon"}[name] + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_cameras=False,
        export_lights=False,
    )


car("HighSpeed_Front", True)
car("HighSpeed_Wagon", True)
