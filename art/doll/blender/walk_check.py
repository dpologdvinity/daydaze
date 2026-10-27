"""Gait check: compares a walk's knee flexion, thigh swing and foot height in
the source Mixamo FBX against our clip as mocap.py bakes it onto the doll's rig.

    blender --background --factory-startup --python art/doll/blender/walk_check.py -- walk-normal walk-easy

Per frame, from world joint positions (so bone axes and roll don't matter):
  knee   flexion = 180 - angle(hip-knee, ankle-knee), degrees (0 = straight)
  thigh  pitch of hip->knee from straight down in the walking direction, degrees
         (+ = knee forward of the hip), relative to the pelvis' own heading
  foot   ankle height above the clip's lowest ankle, in leg lengths (scale-free)
  heel   ankle height of the back foot at its highest, same unit
Prints min/max/mean per clip and side, source row then baked row.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mocap  # noqa: E402  (main() is guarded; only its helpers are used)

def joints(arm, f):
    bpy.context.scene.frame_set(f)
    return {mocap.short(pb.name): arm.matrix_world @ pb.head for pb in arm.pose.bones}


def angle(a, b):
    return math.degrees(a.angle(b))


def measure(arm, f0, f1):
    """Per side: lists of knee flexion, thigh pitch and ankle height per frame."""
    out = {}
    frames = [joints(arm, f) for f in range(f0, f1 + 1)]
    # walking direction: the hips' horizontal travel is removed in baked clips,
    # so use the pelvis' left-right axis crossed with up (same for both rigs)
    side = (frames[0]["LeftUpLeg"] - frames[0]["RightUpLeg"]).normalized()
    fwd = Vector((0, 0, 1)).cross(side)
    fwd.z = 0
    fwd.normalize()
    leg = None
    for s in ("Left", "Right"):
        h = [(j[f"{s}UpLeg"], j[f"{s}Leg"], j[f"{s}Foot"]) for j in frames]
        leg = leg or ((h[0][0] - h[0][1]).length + (h[0][1] - h[0][2]).length)
        knee = [180 - angle(a - k, b - k) for a, k, b in h]
        thigh = [math.degrees(math.atan2((k - a).dot(fwd), -(k - a).z)) for a, k, b in h]
        out[s] = (knee, thigh, [b.z for a, k, b in h])
    low = min(min(v[2]) for v in out.values())
    for s in out:
        k, t, z = out[s]
        out[s] = (k, t, [(x - low) / leg for x in z])
    # the pelvis heading may be flipped between rigs (fwd sign): fix so that
    # the thigh pitch is positive when the knee leads, i.e. mean toe is ahead
    toe_ahead = sum((j["LeftToeBase"] - j["LeftFoot"]).dot(fwd) for j in frames)
    if toe_ahead < 0:
        for s in out:
            out[s] = (out[s][0], [-x for x in out[s][1]], out[s][2])
    return out


def stats(v):
    return f"{min(v):6.1f} {max(v):6.1f} {sum(v) / len(v):6.1f}"


def report(tag, cid, m):
    for s, (k, t, z) in m.items():
        print(f"{cid:14s} {tag:6s} {s:5s} knee[min max mean] {stats(k)} | thigh {stats(t)} | ankle(leg) {min(z):.2f} {max(z):.2f}")


def main():
    ids = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["walk-normal", "walk-relaxed", "walk-brisk"]
    # bake in memory with mocap.py's own code (the shipped GLB is this, resampled
    # at 0.003 and meshopt-packed), then measure the action on the bare rig
    bpy.ops.wm.open_mainfile(filepath=mocap.RIG_BLEND)
    bpy.context.scene.render.fps = mocap.FPS
    rig = bpy.data.objects["Rig"]
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    rest = mocap.rest_of(rig)
    for cid in ids:
        rel, kind, _ = mocap.CLIPS[cid]
        mocap.bake(rig, rest, cid, rel, kind)
        act = bpy.data.actions[cid]
        rig.animation_data.action = act
        f0, f1 = (int(round(x)) for x in act.frame_range)
        baked = measure(rig, f0, f1)
        rig.animation_data.action = None
        src, new = mocap.import_clip(os.path.join(mocap.MIXAMO, rel + ".fbx"))
        a = src.animation_data.action
        g0, g1 = (int(round(x)) for x in a.frame_range)
        report("source", cid, measure(src, g0, g1))
        report("baked", cid, baked)
        for o in new:
            bpy.data.objects.remove(o)


if __name__ == "__main__":
    main()
