"""Dev-only: counts body vertices that poke through a garment in a baked clip.

    blender --background --factory-startup --python art/doll/blender/skin_check.py -- \
        Outfit_suit [sex=male] [pack=social] [clips=idle,walk] [frames=6]

Imports the raw build (.cache/out), wears the garment (its tuck key at 1) and,
for frames spread over each clip, reports the body vertices the tuck sank that
sit outside the cloth's surface (skin showing through). `clips` are action
name prefixes; with none given, every clip in the pack is checked.
"""

import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("DOLL_DIR") or os.path.join(HERE, ".cache", "out")  # DOLL_DIR=public/models/doll: the shipped parts
args = sys.argv[sys.argv.index("--") + 1 :]
part = args[0]
opts = dict(a.split("=") for a in args[1:])
sfx = "-m" if opts.get("sex") == "male" else ""
count = int(opts.get("frames", 6))
pack = f"-{opts['pack']}" if opts.get("pack") else ""
wanted = [c for c in opts.get("clips", "").split(",") if c]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"body{sfx}.glb"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys and "tuck_" + part.split("_", 1)[1] in o.data.shape_keys.key_blocks)
kind, name = part.split("_", 1)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f"{kind.lower()}-{name}{sfx}.glb"))
garment = None
for o in set(bpy.data.objects) - before:
    if o.type == "MESH":
        for m in o.modifiers:
            if m.type == "ARMATURE":
                m.object = rig
        o.parent = rig
        garment = o
    elif o.type == "ARMATURE":
        bpy.data.objects.remove(o)
for ob in (body, garment):
    if ob.data.shape_keys:
        for kb in ob.data.shape_keys.key_blocks:
            kb.value = 1.0 if kb.name == f"tuck_{name}" else 0.0
before = set(bpy.data.objects)
# the baked clips ship only optimized (meshopt); Blender reads those
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "..", "..", "..", "public", "models", "doll", f"anims{pack}{sfx}.glb"))
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
rig.animation_data_create()

# the vertices this garment's tuck sank: the skin it covers
keys = body.data.shape_keys.key_blocks
n = len(body.data.vertices)
base, tuck = np.empty(n * 3), np.empty(n * 3)
keys["Basis"].data.foreach_get("co", base)
keys[f"tuck_{name}"].data.foreach_get("co", tuck)
covered = np.where(np.abs(tuck - base).reshape(-1, 3).sum(1) > 1e-6)[0]
print(f"{part}: {len(covered)} of {n} body vertices covered")

rest = np.array([v.co[:] for v in body.data.vertices])  # bind pose, tucked
sc = bpy.context.scene
for act in sorted(bpy.data.actions, key=lambda a: a.name):
    if wanted and not any(act.name.startswith(w) for w in wanted):
        continue
    rig.animation_data.action = act
    if act.slots:
        rig.animation_data.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    worst, worst_at, where = 0, 0, {}
    for i in range(count):
        sc.frame_set(int(f0 + (f1 - f0) * i / count))
        dg = bpy.context.evaluated_depsgraph_get()
        bvh = BVHTree.FromObject(garment, dg)
        ev = body.evaluated_get(dg)
        me = ev.to_mesh()
        poked = 0
        for v in covered:
            p = ev.matrix_world @ me.vertices[v].co
            loc, nor, _f, _d = bvh.find_nearest(p, 0.05)
            if loc is not None and (p - loc).dot(nor) > 0.0005:
                poked += 1
                where[int(rest[v][2] * 10)] = where.get(int(rest[v][2] * 10), 0) + 1
        ev.to_mesh_clear()
        if poked > worst:
            worst, worst_at = poked, i
    print(f"  {act.name}: worst {worst} poking (frame {worst_at}/{count}), by height {dict(sorted(where.items()))}")
