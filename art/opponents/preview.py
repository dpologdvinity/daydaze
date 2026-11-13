"""Dev-only: renders a built opponent in a Universal Animation Library clip.

    UAL_GLB=<UAL1_Standard.glb> blender --background --factory-startup \
      --python art/opponents/preview.py -- opponent-f [clip:frame ...] [dir=out] [focus=x,y,z,distance]

Imports art/opponents/.cache/out/<name>.glb (or OPP_DIR/<name>.glb), plays each
`clip:frame` on its rig and writes workbench renders (front, side, back) of the
pose into dir. Cloth pieces get a color by their vertex grey: team red jersey
and helmet, dark pants, black shoes; the vest is gold; skin shows its texture.
"""

import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1 :]
name = args[0]
opts = dict(a.split("=", 1) for a in args[1:] if "=" in a)
shots = [a for a in args[1:] if ":" in a and "=" not in a] or ["Idle_Loop:1"]
out = opts.get("dir", os.path.join(HERE, ".cache", "preview"))
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(os.environ.get("OPP_DIR", os.path.join(HERE, ".cache", "out")), f"{name}.glb"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.environ["UAL_GLB"])
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
cloth = next((o for o in meshes if o.name.startswith("Cloth")), None)
if cloth:
    # one material slot per piece, picked by the vertex grey
    me = cloth.data
    attr = me.color_attributes.get("Color") or me.color_attributes[0]
    palette = {1.0: (0.9, 0.15, 0.15), 0.9: (0.9, 0.15, 0.15), 0.32: (0.1, 0.12, 0.3), 0.1: (0.02, 0.02, 0.02)}
    slots = {}
    for poly in me.polygons:
        g = round(attr.data[poly.loop_start].color[0], 1)
        key = min(palette, key=lambda k: abs(k - g))
        if key not in slots:
            mat = bpy.data.materials.new(f"p{key}")
            mat.diffuse_color = (*palette[key], 1)
            me.materials.append(mat)
            slots[key] = len(me.materials) - 1
        poly.material_index = slots[key]
for o in meshes:
    if o.name.startswith("Vest"):
        o.data.materials.clear()
        mat = bpy.data.materials.new("vest")
        mat.diffuse_color = (1, 0.8, 0.1, 1)
        o.data.materials.append(mat)

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x, sc.render.resolution_y = 600, 800
sc.render.film_transparent = False
rig.animation_data_create()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
cam.data.lens = 55
sc.camera = cam

for shot in shots:
    clip, frame = shot.split(":")
    act = bpy.data.actions[clip]
    rig.animation_data.action = act
    if act.slots:
        rig.animation_data.action_slot = act.slots[0]
    sc.frame_set(int(frame))
    # focus=x,y,z,distance looks at a point from that far instead of the whole figure
    fx, fy, fz, fd = (float(v) for v in opts["focus"].split(",")) if "focus" in opts else (0, 0, 0.9, 4.2)
    aim = Vector((fx, fy, fz))
    for tag, eye in (
        ("front", (fx, fy - fd, fz)),
        ("side", (fx + fd, fy, fz)),
        ("back", (fx, fy + fd, fz)),
    ):
        cam.location = eye
        d = aim - Vector(eye)
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(out, f"{name}-{clip}-{frame}-{tag}.png")
        bpy.ops.render.render(write_still=True)
print("wrote", out)
