# Convert the owner's Sushi Restaurant Kit glTF files to one-mesh props.
# Run: blender -b --factory-startup --python art/sushi/build.py -- KIT_DIR OUTPUT_DIR
import bpy
import glob
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
source, output = args
names = ['Environment_Stool', 'Environment_Table', 'Environment_Chair1', 'Environment_Counter_Straight', 'Environment_Counter_Sink', 'Environment_Oven', 'Environment_Cabinet_Shelves', 'Environment_Pot_1_Filled', 'Environment_Plate', 'Decoration_Light', 'Wall_Door', 'Wall_Shoji', 'Food_Ramen', 'Food_SalmonNigiri', 'Food_Roll']
os.makedirs(output, exist_ok=True)
for name in names:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    paths = glob.glob(os.path.join(source, '*', 'glTF', name + '.gltf'))
    if len(paths) != 1:
        raise RuntimeError(f'Expected one {name}, found {paths}')
    bpy.ops.import_scene.gltf(filepath=paths[0])
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError(f'{name} contains no mesh')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=os.path.join(output, name + '.glb'), export_format='GLB')
