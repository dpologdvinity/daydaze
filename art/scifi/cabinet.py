# Bake the Poly Pizza arcade machine's materials into one instanced mesh.
# Run with blender --background --factory-startup --python art/scifi/cabinet.py -- input.glb output.glb
import sys
import bpy

source, output = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and 'GameScreen' not in o.name]
for ob in list(bpy.context.scene.objects):
    if ob.type == 'MESH' and ob not in meshes:
        bpy.data.objects.remove(ob, do_unlink=True)
for ob in meshes:
    mesh = ob.data
    colors = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for face in mesh.polygons:
        mat = mesh.materials[face.material_index]
        node = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        color = node.inputs['Base Color'].default_value if node else (0.8, 0.8, 0.8, 1)
        for i in face.loop_indices:
            colors.data[i].color = color
    mesh.color_attributes.active_color = colors
    mesh.materials.clear()
    mesh.materials.append(bpy.data.materials.get('Cabinet') or bpy.data.materials.new('Cabinet'))
    for face in mesh.polygons:
        face.material_index = 0
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
mat = meshes[0].data.materials[0]
mat.use_nodes = True
node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
node.layer_name = 'Color'
bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB')
