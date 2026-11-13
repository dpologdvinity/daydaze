"""Writes the opponents' clips: a few Universal Animation Library (CC0) clips
as one animation-only GLB. The library's skeleton is the Base Characters' own,
so the clips play on the opponents' bones as they are, no retargeting.

    UAL_GLB=<UAL1_Standard.glb> \
      blender --background --factory-startup --python art/opponents/build_clips.py

Writes art/opponents/.cache/out/opponent-clips.glb (bone nodes with the clips
on them, no mesh). The ids below are the library's own action names; the
client's pure map from an opponent's state to a clip is src/game/opponents.ts.
"""

import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".cache", "out")
KEEP = [
    "Idle_Loop",
    "Pistol_Idle_Loop",
    "Pistol_Aim_Neutral",
    "Pistol_Shoot",
    "Pistol_Reload",
    "Jog_Fwd_Loop",
    "Sprint_Loop",
    "Crouch_Idle_Loop",
    "Crouch_Fwd_Loop",
    "Hit_Chest",
    "Hit_Head",
    "Death01",
]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ["UAL_GLB"])
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in list(bpy.data.objects):
    if o.type == "MESH":
        bpy.data.objects.remove(o)
for act in list(bpy.data.actions):
    if act.name in KEEP:
        act.use_fake_user = True
        print(act.name, "frames", tuple(round(f) for f in act.frame_range))
    else:
        bpy.data.actions.remove(act)
missing = set(KEEP) - {a.name for a in bpy.data.actions}
assert not missing, f"clips not in the library: {missing}"
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
os.makedirs(OUT, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "opponent-clips.glb"),
    use_selection=True,
    export_format="GLB",
    export_yup=True,
    export_animation_mode="ACTIONS",
    export_force_sampling=True,
    export_optimize_animation_size=True,
    export_skins=False,
)
print("wrote", OUT)
