"""Adapt downloaded CC-BY wheel/kiln scans and a CC0 Quaternius drying shelf.
Inputs: scripts/with-env.sh python3 art/pottery/fetch.py, owner's unpacked
Quaternius Ultimate House Interior pack in /tmp/daydaze-city/q/. No modeling.
Run with Blender --background --factory-startup --python art/pottery/build.py.
Then run art/pottery/optimize.sh. The scans are decimated and recolored; their
photogrammetry textures are removed for load size and the house palette.
"""
import os
import bpy

OUT = '/tmp/daydaze-pottery/out'
os.makedirs(OUT, exist_ok=True)

def export(name):
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # Recolor the scan rather than ship its large photography maps.
    if name in ('wheel', 'kiln'):
        obj.data.materials.clear()
        mat = bpy.data.materials.new('Clay Day / warm enamel')
        mat.diffuse_color = (0.45, 0.57, 0.52, 1)
        mat.use_nodes = True
        mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = mat.diffuse_color
        mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = 0.68
        obj.data.materials.append(mat)
        for p in obj.data.polygons:
            p.material_index = 0
        tri = obj.modifiers.new('Triangulate the scan', 'TRIANGULATE')
        bpy.ops.object.modifier_apply(modifier=tri.name)
        dec = obj.modifiers.new('Low-tier scan reduction', 'DECIMATE')
        dec.ratio = min(1, 7000 / len(obj.data.polygons))
        bpy.ops.object.modifier_apply(modifier=dec.name)
    assert sum(len(p.vertices) - 2 for p in obj.data.polygons) < 20000, 'Prop exceeds the studio budget'
    bpy.ops.export_scene.gltf(filepath=f'{OUT}/{name}.glb', export_format='GLB', use_selection=True)
    print(name, len(obj.data.polygons))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='/tmp/daydaze-pottery/wheel/scene.gltf')
export('wheel')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath='/tmp/daydaze-city/q/Ultimate_House_Interior_Pack__June_2020/Ultimate House Interior Pack - June 2020/FBX/Shelf_Large.fbx')
export('drying-shelf')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='/tmp/daydaze-pottery/kiln/scene.gltf')
export('kiln')
