"""Convert the owner-supplied CC-BY mermaid: unzip mermaid.zip to /tmp/mermaid first.

Run: blender --background --factory-startup --python art/cove/build_mermaid.py
Then: npx -y @gltf-transform/cli@4.5.1 optimize /tmp/mermaid.glb public/models/cove/mermaid.glb --compress meshopt --texture-compress webp --flatten false --palette false --prune-attributes false
"""
import os
import bpy

bpy.ops.import_scene.fbx(filepath='/tmp/mermaid/source/rig export fix1.fbx')
mesh = bpy.data.objects['body mesh']
rig = bpy.data.objects['rig']
# Morph targets prevent Blender's decimator from running; the kept takes animate bones.
mesh.shape_key_clear()
bpy.context.view_layer.objects.active = mesh
mod = mesh.modifiers.new('Reduce triangles', 'DECIMATE')
mod.ratio = 0.12
bpy.ops.object.modifier_apply(modifier=mod.name)
for obj in list(bpy.data.objects):
    if obj.type in {'CAMERA', 'LIGHT'} or obj.name == 'Cube':
        bpy.data.objects.remove(obj, do_unlink=True)
# The FBX contains absolute Windows paths. Reconnect the supplied texture maps.
files = {
    'Material_BaseColor.png.005': 'Material_BaseColor2.png',
    'Material_Metallic.png.005': 'Material_Metallic.png',
    'Material_Normal.png.004': 'Material_Normal.png',
    'Material_Roughness.png.005': 'Material_Roughness.png',
    'Material_Emission.png': 'Material_Emission222.png',
    'hair 2.png': 'hair_2.png', 'hair noirmal.png': 'hair_noirmal.png',
    'eyeball_Base_Color222222.png': 'eyeball_Base_Color222222.png',
    'DefaultMaterial_BaseColor.png': 'DefaultMaterial_BaseColor.png',
    'DefaultMaterial_Normal.png.003': 'DefaultMaterial_Normal.png',
    'DefaultMaterial_Roughness.png': 'DefaultMaterial_Roughness.png',
}
for image in bpy.data.images:
    if image.name in files:
        image.filepath = os.path.join('/tmp/mermaid/textures', files[image.name])
        image.reload()
        if max(image.size) > 1024:
            image.scale(1024, 1024)
        image.pack()
# NLA tracks export the three actions as separately named GLB clips.
rig.animation_data.action = None
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
for source, name in [('rig|idol', 'idle'), ('rig|sitting idol', 'sit'), ('rig|swim', 'swim')]:
    action = bpy.data.actions[source]
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(action.frame_range[0]), action)
for action in list(bpy.data.actions):
    if action.name not in {'rig|idol', 'rig|sitting idol', 'rig|swim'}:
        bpy.data.actions.remove(action)
# The Rigify rig has 956 bones, but the skin uses about 170. Only those stay deform
# bones; the exporter drops the rest and bakes the clips onto the kept ones.
weighted = set()
groups = {g.index: g.name for g in mesh.vertex_groups}
for vertex in mesh.data.vertices:
    for g in vertex.groups:
        if g.weight > 0 and g.group in groups:
            weighted.add(groups[g.group])
for bone in rig.data.bones:
    bone.use_deform = bone.name in weighted
print('DEFORM BONES', len(weighted))
mesh.data.calc_loop_triangles()
print('TRIANGLES', len(mesh.data.loop_triangles))
assert 10000 <= len(mesh.data.loop_triangles) <= 15000
bpy.ops.export_scene.gltf(filepath='/tmp/mermaid.glb', export_format='GLB', export_animation_mode='NLA_TRACKS',
                          export_def_bones=True, export_optimize_animation_size=True)
