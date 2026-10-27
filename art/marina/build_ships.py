# Convert Quaternius' CC0 sailboat from the downloaded Ships pack to glTF.
import bpy
from pathlib import Path

root = Path('/tmp/daydaze-city/q/Ships_by__Quaternius/Ships by @Quaternius/FBX')
out = Path('/tmp/daydaze-marina')
out.mkdir(exist_ok=True)
for name in ('BoatWSail',):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.fbx(filepath=str(root / (name + '.fbx')))
    for material in bpy.data.materials:
        material.diffuse_color[3] = 1.0
        if material.use_nodes:
            shader = material.node_tree.nodes.get('Principled BSDF')
            if shader:
                shader.inputs['Alpha'].default_value = 1.0
        material.surface_render_method = 'DITHERED'
    bpy.ops.export_scene.gltf(filepath=str(out / (name + '.glb')), export_format='GLB')
