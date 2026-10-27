"""Bakes Kenney's Mini Characters (CC0) into static posed people for the
Speedway: grandstand fans (standing and cheering, four looks each) and the
pit crew's crouch. Run:

    blender --background --factory-startup --python art/speedway/build_people.py

Writes art/speedway/.cache/people/<name>.glb (the Kenney skinned character at
rest, one joined mesh with its texture, posed by rotating its bones, then the
armature baked away) for scripts/import-speedway.sh to compress. Kenney's
models are about half a meter tall, so the client scales them up.
"""

import math
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get(
    "KENNEY_CHARS", "/tmp/daydaze-city/kenney/mini-characters/Models/GLB format"
)
OUT = os.path.join(HERE, ".cache", "people")

LOOKS = ["character-male-a", "character-female-c", "character-male-d", "character-female-a"]

# bone -> (x, y, z) Euler degrees in the bone's own frame
POSES = {
    # arms down at the sides (the model rests in a T)
    "idle": {"arm-left": (0, 0, 78), "arm-right": (0, 0, -78)},
    # both arms thrown up
    "cheer": {"arm-left": (0, 0, -150), "arm-right": (0, 0, 150)},
    # down on the heels, leaning in, hands forward
    "crouch": {
        "leg-left": (-95, 0, 0),
        "leg-right": (-95, 0, 0),
        "torso": (25, 0, 0),
        "arm-left": (-70, 0, 0),
        "arm-right": (-70, 0, 0),
    },
}


def bake(look: str, pose: str) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, look + ".glb"))
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o.name == "Icosphere"]:
        bpy.data.objects.remove(o)  # the importer's stray helper
    for name, euler in POSES[pose].items():
        pb = arm.pose.bones[name]
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = tuple(math.radians(a) for a in euler)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    baked = []
    for o in [o for o in bpy.data.objects if o.type == "MESH"]:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(deps), depsgraph=deps)
        ob = bpy.data.objects.new(o.name + "-baked", me)
        ob.matrix_world = o.matrix_world
        bpy.context.collection.objects.link(ob)
        ob.vertex_groups.clear()
        baked.append(ob)
    for o in list(bpy.data.objects):
        if o not in baked:
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in baked:
        o.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = f"{look}-{pose}"
    # feet on the floor, apply transforms
    lowest = min((ob.matrix_world @ v.co).z for v in ob.data.vertices)
    ob.location.z -= lowest
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{look}-{pose}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB")
    print("BUILT", path, len(ob.data.polygons), [round(d, 2) for d in ob.dimensions])


for look in LOOKS:
    for pose in ("idle", "cheer"):
        bake(look, pose)
bake("character-male-b", "crouch")
