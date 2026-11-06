# Convert selected CC0 Quaternius food FBXs to single-material vertex-colored GLBs.
# Run via art/food/build.sh with the two packs unpacked under /tmp/food-kit.
import bpy
import os
import sys

root, output, *selected = sys.argv[sys.argv.index('--') + 1:]
packs = {
    'Ultimate Food Pack - Oct 2019': ['Apple', 'Apple_Green', 'Orange', 'Banana', 'Carrot', 'Tomato', 'Broccoli', 'Bread', 'PeanutButter', 'KetchupBottle', 'MustardBottle', 'ChocolateBar', 'Burger', 'Fries', 'Pizza_Slice', 'Hotdog', 'Pancakes_Stack', 'ChickenLeg', 'Fish', 'Plate', 'Steak', 'Egg_Fried', 'Pumpkin', 'Lettuce_Whole', 'Eggplant', 'Pepper_Red', 'Turnip', 'Avocado'],
    'Junk Food Pack - Apr 2017': ['SodaCan', 'Donut'],
}
os.makedirs(output, exist_ok=True)
for pack, names in packs.items():
    for name in names:
        if selected and name not in selected:
            continue
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.fbx(filepath=os.path.join(root, pack, 'FBX', name + '.fbx'))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        assert meshes, name
        for obj in meshes:
            mesh = obj.data
            for attr in list(mesh.color_attributes):
                mesh.color_attributes.remove(attr)
            if not pack.startswith('Junk'):
                colors = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
                for poly in mesh.polygons:
                    mat = mesh.materials[poly.material_index] if poly.material_index < len(mesh.materials) else None
                    color = tuple(mat.diffuse_color) if mat else (0.8, 0.8, 0.8, 1)
                    for index in poly.loop_indices:
                        colors.data[index].color = color
            mesh.materials.clear()
        bpy.ops.object.select_all(action='DESELECT')
        for obj in meshes:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        obj = bpy.context.active_object
        mat = bpy.data.materials.new('Food')
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        if pack.startswith('Junk'):
            color = nodes.new('ShaderNodeTexImage')
            texture = 'SodaCan.png' if name == 'SodaCan' else 'DonutTexture.png'
            color.image = bpy.data.images.load(os.path.join(root, pack, 'Blender', 'Textures', texture), check_existing=True)
        else:
            color = nodes.new('ShaderNodeVertexColor')
            color.layer_name = 'Color'
        mat.node_tree.links.new(color.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])
        obj.data.materials.append(mat)
        prefix = 'junk' if pack.startswith('Junk') else 'food'
        bpy.ops.export_scene.gltf(filepath=os.path.join(output, prefix + '-' + name + '.glb'), export_format='GLB')
