# Convert downloaded transport to single-material vertex-color glTF, +X forward.
# See scripts/import-transit.sh for sources, licensing and reproducible invocation.
import bpy, math, sys
from mathutils import Matrix, Vector
source, output, kind, detail = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
if source.endswith('.fbx'):
    bpy.ops.import_scene.fbx(filepath=source)
else:
    bpy.ops.import_scene.gltf(filepath=source)
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# Blender Z is glTF Y. Taxi/sedan/van noses point toward Blender -Y.
rotation = Matrix.Rotation(math.pi / 2 if kind in ('taxi', 'sedan', 'van') else math.pi if kind == 'bus' else 0, 4, 'Z')
for o in objects:
    o.data.transform(rotation @ o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
points = [v.co for o in objects for v in o.data.vertices]
lo = Vector(tuple(min(v[i] for v in points) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in points) for i in range(3)))
size = hi - lo
scale = (8.8 / size.x if kind == 'bus' else 4.2 / size.x if kind in ('taxi', 'sedan') else 4.6 / size.x if kind == 'van' else 3.0 / size.z)
center = Vector(((hi.x + lo.x) / 2, (hi.y + lo.y) / 2, lo.z))
for o in objects:
    for v in o.data.vertices:
        v.co = (v.co - center) * scale
        if kind == 'bus':
            v.co.y *= 2.45 / (size.y * scale)
            v.co.z *= 3.15 / (size.z * scale)
    colors = o.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for face in o.data.polygons:
        mat = o.data.materials[face.material_index] if o.data.materials else None
        color = (0.5, 0.5, 0.5, 1)
        if mat:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if mat.use_nodes else None
            color = tuple(bsdf.inputs['Base Color'].default_value) if bsdf else tuple(mat.diffuse_color)
            if kind == 'bus':
                color = {'Bottom': (0.04, .22, .32, 1), 'Top': (.7, .75, .69, 1), 'Windows': (.025, .07, .10, 1), 'Lights': (1, .85, .5, 1), 'Details': (.025,.03,.04,1), 'Bumper': (.18,.2,.22,1), 'Material': (.018,.022,.025,1)}.get(mat.name, color)
        for index in face.loop_indices:
            # Kenney's palette texture carries all van colors; sample its UVs.
            if kind == 'van' and mat and mat.use_nodes:
                tex = next((n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
                if tex and o.data.uv_layers.active:
                    uv = o.data.uv_layers.active.data[index].uv
                    w, h = tex.size
                    pixel = 4 * (min(h-1, max(0, int(uv.y*h))) * w + min(w-1, max(0, int(uv.x*w))))
                    color = tuple(tex.pixels[pixel:pixel+4])
            colors.data[index].color = color
            if kind == 'taxi' and mat and mat.name == 'Headlights':
                assert o.data.vertices[o.data.loops[index].vertex_index].co.x > 0, 'Headlights must face +X'
    o.data.materials.clear()
bpy.ops.object.select_all(action='DESELECT')
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
o = bpy.context.object
if detail == 'lo':
    mod = o.modifiers.new('Distance LOD', 'DECIMATE')
    mod.ratio = .18 if kind != 'stop' else .6
    bpy.ops.object.modifier_apply(modifier=mod.name)
mat = bpy.data.materials.new('Transit')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
vertex = mat.node_tree.nodes.new('ShaderNodeVertexColor')
vertex.layer_name = 'Color'
mat.node_tree.links.new(vertex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = .72
o.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True)
