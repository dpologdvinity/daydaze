# Restyle downloaded Kenney van + Quaternius cone and merge the downloaded cart.
# Run through scripts/import-vendors.sh; all inputs are credited in docs/assets.md.
import bpy, sys
from mathutils import Matrix, Vector
source, output, kind = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)

def load(path, height=None, lift=0):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    result = [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']
    points = [o.matrix_world @ v.co for o in result for v in o.data.vertices]
    lo = Vector(tuple(min(v[i] for v in points) for i in range(3)))
    hi = Vector(tuple(max(v[i] for v in points) for i in range(3)))
    scale = height / (hi.z-lo.z) if height else 1
    center = Vector(((lo.x+hi.x)/2, (lo.y+hi.y)/2, lo.z)) if height else Vector((0,0,0))
    transform = Matrix.Translation((0,0,lift)) @ Matrix.Scale(scale,4) @ Matrix.Translation(-center)
    for o in result:
        o.data.transform(transform @ o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        old = o.data.color_attributes.active_color
        colors = []
        for face in o.data.polygons:
            mat = o.data.materials[face.material_index] if o.data.materials else None
            bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat and mat.use_nodes else None
            base = tuple(bsdf.inputs['Base Color'].default_value) if bsdf else tuple(mat.diffuse_color) if mat else (.7,.7,.7,1)
            for index in face.loop_indices:
                c = tuple(old.data[index if old.domain == 'CORNER' else o.data.loops[index].vertex_index].color) if old else base
                if kind == 'truck' and lift == 0:
                    z = o.data.vertices[o.data.loops[index].vertex_index].co.z
                    x = o.data.vertices[o.data.loops[index].vertex_index].co.x
                    if c[2] > c[0] * 1.5:
                        # The downloaded blue paint becomes mint and strawberry.
                        c = (.85,.43,.55,1) if z < .85 else (.48,.85,.72,1)
                    elif max(c[:3]) > .55:
                        # The source's pale glass is dark teal; lamps stay cream.
                        c = (1,.9,.65,1) if x > 1.9 and z < 1 else (.025,.065,.075,1)
                colors.append((index, c))
        for attr in list(o.data.color_attributes): o.data.color_attributes.remove(attr)
        attr = o.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for index, c in colors: attr.data[index].color = c
        o.data.materials.clear()
    return result

objects = load(source + ('/van.glb' if kind == 'truck' else '/cart.glb'), height=None if kind == 'truck' else 2.4)
if kind == 'truck':
    top = max(v.co.z for o in objects for v in o.data.vertices)
    objects += load(source + '/cone.glb', height=1.2, lift=top)
else:
    # Preserve each disconnected support before simplifying the larger pieces.
    for o in list(objects):
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=.00001)
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    # Rivets and crumbs under 6 cm are invisible at street distance; drop them.
    for o in list(objects):
        if max(o.dimensions) < .06: bpy.data.objects.remove(o, do_unlink=True)
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in objects:
        tris=sum(len(p.vertices)-2 for p in o.data.polygons)
        if tris <= 40: continue
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Cart LOD', 'DECIMATE')
        mod.ratio=max(40/tris, .06)
        bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT')
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
o = bpy.context.object
if kind == 'cart':
    # Boardwalk carts are ~300 tris; keep this one under ~1,500 (street-food view budget).
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    top = max(v.co.z for v in o.data.vertices)
    # Hard-edged imports arrive with split vertices, which stalls the collapse; weld them first.
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    planar = o.modifiers.new('Cart planar', 'DECIMATE')
    planar.decimate_type = 'DISSOLVE'
    planar.angle_limit = .17
    planar.delimit = {'MATERIAL'}
    bpy.ops.object.modifier_apply(modifier=planar.name)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    # Collapse stalls on thin supports, so repeat until the budget holds.
    for _ in range(4):
        if tris <= 1400: break
        mod = o.modifiers.new('Cart budget', 'DECIMATE')
        mod.ratio = max(1100 / tris, .5)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    # Collapsing thin supports shortens the umbrella; scale back to the original height.
    shrunk = max(v.co.z for v in o.data.vertices)
    o.data.transform(Matrix.Scale(top / shrunk, 4))
mat = bpy.data.materials.new('Pastel street food')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
vertex = mat.node_tree.nodes.new('ShaderNodeVertexColor')
vertex.layer_name = 'Color'
mat.node_tree.links.new(vertex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = .72
o.data.materials.clear()
o.data.materials.append(mat)
for face in o.data.polygons: face.material_index = 0
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True)
