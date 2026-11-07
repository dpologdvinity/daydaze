"""Build Mermaid Cove's four singing shells (Siren Song's notes) from Poly Pizza
downloads, all CC-BY 3.0 and credited in docs/assets.md. Put these in one folder:

  5ovn4mnRejL.glb  "Seashell" by Poly by Google (a scallop and a conch in one mesh)
  8675QcluLQX.glb  "Clam" by Poly by Google
  2BU9U8dOkh-.glb  "seashell" by Dario Demi (a spiral)

Run: blender --background --factory-startup --python art/cove/build_shells.py -- <folder> /tmp/shells.glb
Then: npx -y @gltf-transform/cli@4.5.1 optimize /tmp/shells.glb public/models/cove/shells.glb \
  --compress meshopt --texture-compress webp --texture-size 256 --flatten false

Each shell becomes one mesh node named for its kind (scallop, conch, clam, spiral),
standing on its origin, its widest side SIZE meters, its face toward -Y (glTF +Z,
the beach). The client tints each to its note's color.
"""
import math
import os
import sys

import bpy
import mathutils

folder, out = sys.argv[sys.argv.index('--') + 1:][:2]
SIZE = 0.9
# extra turns (degrees, XYZ) that set each shell down the way it reads best
TURN = {
    'scallop': (15, 0, 0),
    'conch': (0, 80, 0),
    'clam': (0, 0, 0),
    'spiral': (0, 0, 0),
}

bpy.ops.wm.read_factory_settings(use_empty=True)


def load(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(folder, name))
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def select(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


shells = {}
# the Seashell download is one mesh with a material per shell: split it, the
# flatter part is the scallop
pack = load('5ovn4mnRejL.glb')
select(pack)
bpy.ops.object.join()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.separate(type='MATERIAL')
bpy.ops.object.mode_set(mode='OBJECT')
parts = sorted(bpy.context.selected_objects, key=lambda o: o.dimensions.z / max(o.dimensions))
shells['scallop'], shells['conch'] = parts[0], parts[-1]
for name, file in (('clam', '8675QcluLQX.glb'), ('spiral', '2BU9U8dOkh-.glb')):
    objs = load(file)
    select(objs)
    if len(objs) > 1:
        bpy.ops.object.join()
    shells[name] = bpy.context.view_layer.objects.active

for name, obj in shells.items():
    select([obj])
    obj.name = obj.data.name = name
    obj.rotation_mode = 'XYZ'  # the glTF importer leaves quaternions on
    obj.rotation_euler = [math.radians(a) for a in TURN[name]]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # stand on the origin: centered in x/y, bottom at z 0, widest side SIZE
    pts = [mathutils.Vector(v.co) for v in obj.data.vertices]
    lo = mathutils.Vector([min(p[i] for p in pts) for i in range(3)])
    hi = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
    k = SIZE / max(hi - lo)
    shift = mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for v in obj.data.vertices:
        v.co = (v.co - shift) * k
    obj.location = (0, 0, 0)
    obj.data.update()
    print('SHELL', name, 'tris', sum(len(p.vertices) - 2 for p in obj.data.polygons), 'dims', tuple(round(d, 2) for d in obj.dimensions))

# pale grayscale textures (luminance into 0.55..1): the client's note colors tint
# them cleanly, and the surface detail stays
for image in bpy.data.images:
    if image.size[0] > 256:
        image.scale(256, 256)
    px = list(image.pixels)
    lum = [0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2] for i in range(0, len(px), 4)]
    top = max(lum) or 1
    for j, value in enumerate(lum):
        g = 0.55 + 0.45 * value / top
        px[j * 4:j * 4 + 3] = (g, g, g)
    image.pixels = px
    image.pack()

for obj in list(bpy.data.objects):
    if obj.name not in shells:
        bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
