"""Renders docs/screenshots/doll-walk.png: side-view stick figures of walk
cycles, a row per take with the source Mixamo character on top and our baked
doll rig under it (same scale, in leg lengths), so a gait that reads wrong
shows up by eye. Left leg red, right leg blue.

    blender --background --factory-startup --python art/doll/blender/walk_strip.py -- walk-normal walk-relaxed

Needs the doll's rig (build_doll.py) and the Mixamo library, like mocap.py.
"""

import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mocap  # noqa: E402
import walk_check as wc  # noqa: E402

OUT = os.path.join(mocap.ROOT, "docs", "screenshots", "doll-walk.png")
COLS = 8
SPACING = 0.9  # between figures, in leg lengths
ROW_H = 2.3
LIMBS = [
    ("Hips", "Spine2", None), ("Spine2", "Neck", None), ("Neck", "Head", None),
    ("Spine2", "LeftArm", None), ("LeftArm", "LeftForeArm", None), ("LeftForeArm", "LeftHand", None),
    ("Spine2", "RightArm", None), ("RightArm", "RightForeArm", None), ("RightForeArm", "RightHand", None),
    ("Hips", "LeftUpLeg", "L"), ("LeftUpLeg", "LeftLeg", "L"), ("LeftLeg", "LeftFoot", "L"), ("LeftFoot", "LeftToeBase", "L"),
    ("Hips", "RightUpLeg", "R"), ("RightUpLeg", "RightLeg", "R"), ("RightLeg", "RightFoot", "R"), ("RightFoot", "RightToeBase", "R"),
]
COLOR = {None: (0.45, 0.45, 0.5, 1), "L": (0.9, 0.15, 0.2, 1), "R": (0.15, 0.35, 0.95, 1)}


def material(key):
    m = bpy.data.materials.new(f"m{key}")
    m.diffuse_color = COLOR[key]
    return m


def draw_row(row, label_rows, frames_pts, leg):
    """frames_pts: per sampled frame {bone: Vector} in (fwd, up) meters."""
    mats = {k: material(k) for k in COLOR}
    for col, pts in enumerate(frames_pts):
        for a, b, side in LIMBS:
            cu = bpy.data.curves.new("limb", "CURVE")
            cu.dimensions = "3D"
            cu.bevel_depth = 0.012
            sp = cu.splines.new("POLY")
            sp.points.add(1)
            for p, v in zip(sp.points, (pts[a], pts[b])):
                p.co = ((v[0] / leg) + col * SPACING, 0, (v[1] / leg) + row * ROW_H, 1)
            cu.materials.append(mats[side])
            bpy.context.collection.objects.link(bpy.data.objects.new("limb", cu))
    # floor line under the row
    cu = bpy.data.curves.new("floor", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.006
    sp = cu.splines.new("POLY")
    sp.points.add(1)
    sp.points[0].co = (-0.5, 0, row * ROW_H, 1)
    sp.points[1].co = (COLS * SPACING, 0, row * ROW_H, 1)
    cu.materials.append(mats[None])
    bpy.context.collection.objects.link(bpy.data.objects.new("floor", cu))


def sample_cycle(arm, f0, f1):
    """COLS evenly spaced frames of one cycle, projected to (fwd, up) and
    floored; plus the leg length for scaling."""
    picks = [f0 + round(i * (f1 - f0) / COLS) for i in range(COLS)]
    js = [wc.joints(arm, f) for f in picks]
    side = (js[0]["LeftUpLeg"] - js[0]["RightUpLeg"]).normalized()
    fwd = Vector((0, 0, 1)).cross(side)
    fwd.z = 0
    fwd.normalize()
    if sum((j["LeftToeBase"] - j["LeftFoot"]).dot(fwd) for j in js) < 0:
        fwd = -fwd
    leg = (js[0]["LeftUpLeg"] - js[0]["LeftLeg"]).length + (js[0]["LeftLeg"] - js[0]["LeftFoot"]).length
    floor = min(j[b].z for j in js for b in ("LeftToeBase", "RightToeBase", "LeftFoot", "RightFoot"))
    out = []
    for i, j in enumerate(js):
        # keep the hips over the figure's column: a walk in place
        o = j["Hips"].dot(fwd)
        out.append({k: Vector((v.dot(fwd) - o, v.z - floor)) for k, v in j.items()})
    return out, leg


def main():
    ids = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["walk-normal", "walk-relaxed"]
    bpy.ops.wm.open_mainfile(filepath=mocap.RIG_BLEND)
    bpy.context.scene.render.fps = mocap.FPS
    rig = bpy.data.objects["Rig"]
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    rest = mocap.rest_of(rig)
    rows = []
    for cid in ids:
        rel, kind, _ = mocap.CLIPS[cid]
        mocap.bake(rig, rest, cid, rel, kind)
        act = bpy.data.actions[cid]
        rig.animation_data.action = act
        f0, f1 = (int(round(x)) for x in act.frame_range)
        baked = sample_cycle(rig, f0, f1)
        rig.animation_data.action = None
        src, new = mocap.import_clip(os.path.join(mocap.MIXAMO, rel + ".fbx"))
        g0, g1 = (int(round(x)) for x in src.animation_data.action.frame_range)
        rows.append(sample_cycle(src, g0, g1))  # source above its baked twin
        rows.append(baked)
        for o in new:
            bpy.data.objects.remove(o)
    # purge everything but the drawing: fresh scene content
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    n = len(rows)
    for i, (pts, leg) in enumerate(rows):
        draw_row(n - 1 - i, None, pts, leg)
    scn = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.type = "ORTHO"
    w, h = COLS * SPACING + 0.2, n * ROW_H
    cam.data.ortho_scale = max(w, h)  # ortho_scale spans the longer side
    cam.location = (COLS * SPACING / 2 - 0.3, -10, h / 2 - 0.15)
    cam.rotation_euler = (1.5707963, 0, 0)
    bpy.context.collection.objects.link(cam)
    scn.camera = cam
    scn.render.engine = "BLENDER_WORKBENCH"
    scn.display.shading.color_type = "MATERIAL"
    scn.display.shading.light = "FLAT"
    scn.world = bpy.data.worlds.new("w")
    scn.world.color = (1, 1, 1)
    scn.display.shading.background_type = "WORLD"
    scn.render.resolution_x = 2400
    scn.render.resolution_y = int(2400 * h / w)
    scn.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
