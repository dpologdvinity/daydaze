"""Retargets CMU motion capture (free to copy, modify and redistribute) onto
the doll's 13-joint rig, and writes src/game/dance/mocap.ts.

    art/doll/blender/fetch_cmu.sh
    blender --background --factory-startup --python art/doll/blender/mocap.py

Per frame: forward kinematics of the BVH skeleton; the pelvis frame becomes
the doll's body rotation (the clip turned to face +z, in place); every other
bone takes the shortest rotation from its rest direction to the matching
mocap limb, chained down each limb (twist about the limb is dropped). A
clean loop is found by matching poses, resampled to 15 keys a second.
Angles come out as three.js XYZ Euler, as src/client/avatar/pose.ts uses.
"""

import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CMU = os.path.join(HERE, ".cache", "cmu")
OUT = os.path.join(HERE, "..", "..", "..", "src", "game", "dance", "mocap.ts")
KEYS_OUT = os.path.join(os.path.dirname(OUT), "mocapKeys.ts")

# clip id -> (file, kind, label, loop search window in seconds)
CLIPS = {
    "walk-relaxed": ("07_04", "walk", "Relaxed", (1.0, 1.7)),
    "walk-brisk": ("07_12", "walk", "Brisk", (0.8, 1.3)),
    "salsa": ("60_01", "dance", "Salsa", (2.5, 4.5)),
    "salsa-turns": ("61_01", "dance", "Salsa turns", (2.5, 4.5)),
    "lambada": ("55_02", "dance", "Lambada", (2.5, 4.5)),
    "expressive": ("05_02", "dance", "Expressive", (3.0, 5.0)),
}

KEYS_PER_SECOND = 15
HIP_HEIGHT = 0.92  # the doll's hip height in meters, for the bounce


def parse(path):
    joints, stack, motion = [], [], []
    channels_total = 0
    with open(path) as f:
        lines = f.read().split("\n")
    i = 0
    while i < len(lines):
        p = lines[i].split()
        i += 1
        if not p:
            continue
        if p[0] in ("ROOT", "JOINT"):
            joints.append(
                {"name": p[1], "parent": stack[-1] if stack else -1, "offset": None, "ch": [], "start": 0}
            )
            stack.append(len(joints) - 1)
        elif p[0] == "End":
            joints.append({"name": "End", "parent": stack[-1], "offset": None, "ch": [], "start": 0})
            stack.append(len(joints) - 1)
        elif p[0] == "OFFSET":
            joints[stack[-1]]["offset"] = np.array([float(x) for x in p[1:4]])
        elif p[0] == "CHANNELS":
            j = joints[stack[-1]]
            j["ch"] = p[2 : 2 + int(p[1])]
            j["start"] = channels_total
            channels_total += int(p[1])
        elif p[0] == "}":
            stack.pop()
        elif p[0] == "Frame" and p[1] == "Time:":
            dt = float(p[2])
            motion = [list(map(float, l.split())) for l in lines[i:] if l.strip()]
            break
    return joints, np.array(motion), dt


def rot(axis, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    if axis == "X":
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == "Y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def fk(joints, frame):
    """World position of every joint for one frame (BVH is Y up)."""
    pos = [None] * len(joints)
    world = [None] * len(joints)
    for k, j in enumerate(joints):
        R = np.eye(3)
        t = j["offset"].copy()
        for n, ch in enumerate(j["ch"]):
            v = frame[j["start"] + n]
            if ch.endswith("position"):
                t["XYZ".index(ch[0])] += v
            else:
                R = R @ rot(ch[0], v)
        if j["parent"] < 0:
            world[k] = R
            pos[k] = t
        else:
            pw = world[j["parent"]]
            pos[k] = pos[j["parent"]] + pw @ t
            world[k] = pw @ R
    return pos


def by_name(joints):
    out = {}
    for k, j in enumerate(joints):
        out.setdefault(j["name"], k)  # the first Spine and Neck
    return out


def norm(v):
    return v / (np.linalg.norm(v) + 1e-12)


def from_to(a, b):
    """Rotation taking unit a onto unit b, by axis and angle (Rodrigues).
    Near opposite directions (an arm raised from hanging) the axis is taken
    across the body's front, so it never flips between frames."""
    a, b = norm(a), norm(b)
    c = max(-1.0, min(1.0, float(np.dot(a, b))))
    angle = math.acos(c)
    axis = np.cross(a, b)
    if np.linalg.norm(axis) < 1e-3:
        axis = np.cross(a, [0.0, 0.0, 1.0])
        if np.linalg.norm(axis) < 1e-3:
            axis = np.array([1.0, 0.0, 0.0])
    k = norm(axis)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(angle) * K + (1 - c) * K @ K


def euler_xyz(m):
    """three.js 'XYZ' Euler from a rotation matrix."""
    y = math.asin(max(-1.0, min(1.0, m[0, 2])))
    if abs(m[0, 2]) < 0.9999:
        x = math.atan2(-m[1, 2], m[2, 2])
        z = math.atan2(-m[0, 1], m[0, 0])
    else:
        x = math.atan2(m[2, 1], m[1, 1])
        z = 0.0
    return [x, y, z]


# Rest directions of the doll's bones in its own frame (Y up, facing +z,
# left = +x), matching the re-posed model in build_doll.py.
ARM_REST = {"l": norm(np.array([0.3, -1.0, 0.04])), "r": norm(np.array([-0.3, -1.0, 0.04]))}
LEG_REST = {"l": norm(np.array([0.035, -1.0, 0.0])), "r": norm(np.array([-0.035, -1.0, 0.0]))}
FOOT_REST = norm(np.array([0.0, -0.45, 1.0]))
HEAD_REST = norm(np.array([0.0, 1.0, 0.08]))

LIMBS = {
    # our bone: (mocap from, mocap to, parent, rest direction)
    "lArm": ("LeftArm", "LeftForeArm", "body", ARM_REST["l"]),
    "lFore": ("LeftForeArm", "LeftHand", "lArm", ARM_REST["l"]),
    "rArm": ("RightArm", "RightForeArm", "body", ARM_REST["r"]),
    "rFore": ("RightForeArm", "RightHand", "rArm", ARM_REST["r"]),
    "lLeg": ("LeftUpLeg", "LeftLeg", "body", LEG_REST["l"]),
    "lShin": ("LeftLeg", "LeftFoot", "lLeg", LEG_REST["l"]),
    "lFoot": ("LeftFoot", "LeftToeBase", "lShin", FOOT_REST),
    "rLeg": ("RightUpLeg", "RightLeg", "body", LEG_REST["r"]),
    "rShin": ("RightLeg", "RightFoot", "rLeg", LEG_REST["r"]),
    "rFoot": ("RightFoot", "RightToeBase", "rShin", FOOT_REST),
    "head": ("Neck", "Head", "body", HEAD_REST),
}
JOINT_ORDER = ["body", "head", "lArm", "lFore", "rArm", "rFore", "lLeg", "lShin", "rLeg", "rShin", "lFoot", "rFoot"]


def cmu_frames(path):
    """CMU BVH as frames of {joint name: position}, Y up, at 30 fps."""
    joints, motion, dt = parse(path)
    idx = by_name(joints)
    step = max(1, round((1 / 30) / dt))
    frames = []
    for f in range(0, len(motion), step):
        pos = fk(joints, motion[f])
        frames.append({name: pos[i] for name, i in idx.items()})
    return frames, dt * step


MIXAMO_JOINTS = [
    "Hips", "Spine", "Neck", "Head", "LeftUpLeg", "LeftLeg", "LeftFoot",
    "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
    "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand",
]


def mixamo_frames(path):
    """A Mixamo FBX as frames of {joint name: position}, Y up. Mixamo's
    bone names match CMU's once the mixamorig: prefix is dropped."""
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    scene = bpy.context.scene
    act = arm.animation_data.action if arm.animation_data else None
    start, end = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
    bones = {
        b.name.split(":")[-1]: b for b in arm.pose.bones if b.name.split(":")[-1] in MIXAMO_JOINTS
    }
    frames = []
    for f in range(start, end + 1):
        scene.frame_set(f)
        fr = {}
        for name, b in bones.items():
            w = arm.matrix_world @ b.head
            fr[name] = np.array([w.x, w.z, -w.y])  # Blender Z up to Y up
        frames.append(fr)
    return frames, 1 / scene.render.fps


def retarget(frames, fdt, held=False):
    """`held`: a still pose (sitting, lying), where the clip's own hip height
    is not standing height, so standing height comes from leg length."""

    def P(fr, name):
        return fr[name]

    # facing: the average pelvis forward over the clip, turned onto +z
    fwd = np.zeros(3)
    for fr in frames:
        left = P(fr, "LeftUpLeg") - P(fr, "RightUpLeg")
        up = P(fr, "Spine") - P(fr, "Hips")
        fwd += norm(np.cross(norm(left), norm(up)))
    fwd[1] = 0
    yaw = math.atan2(fwd[0], fwd[2])
    turn = rot("Y", -math.degrees(yaw))
    stand = np.median([P(fr, "Hips")[1] for fr in frames])
    if held:
        fr = frames[len(frames) // 2]
        L = lambda a, b: float(np.linalg.norm(P(fr, a) - P(fr, b)))
        hip = float(np.linalg.norm(P(fr, "Hips") - (P(fr, "LeftUpLeg") + P(fr, "RightUpLeg")) / 2))
        ankle = min(min(P(f, "LeftFoot")[1], P(f, "RightFoot")[1]) for f in frames)
        stand = hip + L("LeftUpLeg", "LeftLeg") + L("LeftLeg", "LeftFoot") + max(ankle, 0.05 * stand)
    scale = HIP_HEIGHT / stand

    # heading per frame, smoothed over about a second: subtracting it keeps
    # the hips' natural twist but drops whole turns, which XYZ Euler on the
    # body cannot hold (the doll's facing is the walker's anyway)
    heads = []
    for fr in frames:
        fr = {n: turn @ p for n, p in fr.items()}
        left = P(fr, "LeftUpLeg") - P(fr, "RightUpLeg")
        up = P(fr, "Spine") - P(fr, "Hips")
        f = np.cross(norm(left), norm(up))
        heads.append(math.atan2(f[0], f[2]))
    heads = np.unwrap(np.array(heads))
    width = max(1, int(1.0 / fdt))
    kernel = np.ones(width) / width
    smooth = np.convolve(np.pad(heads, width, mode="edge"), kernel, mode="same")[width:-width]

    poses = []
    for fi, fr in enumerate(frames):
        spin = rot("Y", -math.degrees(smooth[fi]))
        fr = {n: spin @ (turn @ p) for n, p in fr.items()}
        left = norm(P(fr, "LeftUpLeg") - P(fr, "RightUpLeg"))
        up = P(fr, "Spine") - P(fr, "Hips")
        up = norm(up - left * np.dot(up, left))
        fz = np.cross(left, up)
        R = {"body": np.column_stack([left, up, fz])}
        out = {"body": euler_xyz(R["body"])}
        for bone in JOINT_ORDER[1:]:
            a, b, parent, rest = LIMBS[bone]
            v = R[parent].T @ norm(P(fr, b) - P(fr, a))
            q = from_to(rest, v)
            R[bone] = R[parent] @ q
            out[bone] = euler_xyz(q)
        # vertical bounce only: the clip plays in place
        root = [0.0, float((P(fr, "Hips")[1] - stand) * scale), 0.0]
        poses.append((root, out))
    return poses, fdt


def flat(pose):
    root, joints = pose
    return np.array(root + [a for b in JOINT_ORDER for a in joints[b]])


def best_loop(poses, fdt, window, kind):
    """The segment whose end pose best matches its start. Long takes search
    starts near the middle; short ones anywhere a loop of that length fits."""
    lo, hi = int(window[0] / fdt), int(window[1] / fdt)
    vec = [flat(p) for p in poses]
    n = len(poses)
    hi = min(hi, n - 2)
    lo = min(lo, hi)
    mid = n // 2
    best = (1e9, 0, max(lo, 1))
    for L in range(lo, hi + 1):
        first = max(0, mid - int(2 / fdt))
        last = min(n - L - 2, mid + int(2 / fdt))
        if last < first:
            first, last = 0, n - L - 2
        for s0 in range(first, last + 1):
            d = np.abs(vec[s0] - vec[s0 + L])[1:].sum() + np.abs(vec[s0 + 1] - vec[s0 + L + 1])[1:].sum()
            # a longer loop that matches as well is worth a little: less repetition
            d *= 1 - 0.1 * (L - lo) / max(1, hi - lo)
            if d < best[0]:
                best = (d, s0, L)
    return best[1], best[2]


def keys_for(poses, fdt, s, L):
    period = L * fdt
    n = max(4, int(round(period * KEYS_PER_SECOND)))
    rows = []
    for k in range(n + 1):
        f = s + k * L / n
        a = min(int(f), len(poses) - 2)
        u = f - a
        rows.append(flat(poses[a]) * (1 - u) + flat(poses[a + 1]) * u)
    rows = np.array(rows)
    # every rotation has two XYZ Euler forms, (x, y, z) and
    # (x + pi, pi - y, z + pi); per joint, keep whichever sits closest to the
    # previous key, then unwrap whole turns, so no key flips across
    for j in range(len(JOINT_ORDER)):
        c = slice(3 + 3 * j, 6 + 3 * j)
        for k in range(1, len(rows)):
            prev = rows[k - 1, c]
            a = rows[k, c].copy()
            b = np.array([a[0] + np.pi, np.pi - a[1], a[2] + np.pi])
            near = lambda v: v - np.round((v - prev) / (2 * np.pi)) * 2 * np.pi
            a, b = near(a), near(b)
            rows[k, c] = a if np.abs(a - prev).sum() <= np.abs(b - prev).sum() else b
    # close the loop: spread the end-to-start mismatch across the clip (the
    # last row is the first pose again, one period on)
    # (a full spin in the take unwinds over the loop, since the doll's facing
    # is the walker's, not the dance's)
    residual = rows[n] - rows[0]
    for k in range(n + 1):
        rows[k] -= residual * (k / n)
    keys = []
    for k in range(n):
        v = rows[k]
        root = [round(float(x), 3) for x in v[:3]]
        joints = {}
        for i, b in enumerate(JOINT_ORDER):
            joints[b] = [round(float(x), 3) for x in v[3 + i * 3 : 6 + i * 3]]
        keys.append({"at": round(k * period / n, 4), "root": root, "joints": joints})
    return round(period, 4), keys


# The Mixamo library (repo-root mixamo/, a symlink to the user's own copy,
# git-ignored: Adobe's terms allow use in a game but not redistributing the
# files), files named Name_Description.fbx in topic folders. Hand-picked,
# not the whole library, so mocapKeys.ts stays small. clip id -> (path under
# mixamo/ without .fbx, kind, label). Ids are stable: gaits.ts, pickers,
# NPCs and saved holds name them. Order matters within a kind: the first
# lay clip is the player's lounge, and NPCs pick seeded poses by index.
MIXAMO = os.path.join(HERE, "..", "..", "..", "mixamo")
MIXAMO_CLIPS = {
    # walks only play when a gait names them (src/game/gaits.ts)
    "walk-catwalk": ("walking/styled/Catwalk-Walking_Catwalk-Walk", "walk", "Catwalk"),
    "walk-normal": ("walking/Walk_Female-Walk-2", "walk", "Normal"),
    "walk-sexy": ("walking/styled/Walking_Female-Sexy-Walk", "walk", "Sexy"),
    "walk-easy": ("walking/Walk_Female-Walk-2", "walk", "Easy"),
    "walk-feminine": ("walking/Walking_Feminine-Walk-Forward", "walk", "Feminine"),
    "walk-casual": ("walking/styled/Walking-With-A-Swagger-3", "walk", "Casual"),
    "belly-dance": ("dancing/Dancing_Belly-Dancing-Variation-Three", "dance", "Belly dance"),
    "breakdance": ("dancing/Breakdance-Ending-1_Breakdance-Finishing-Combo-Var-1", "dance", "Breakdance"),
    "afrobeat": ("dancing/Dancing_Female-African-Noodle-Dance", "dance", "Afrobeat"),
    "body-wave": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Body-Wave'-Dancing", "dance", "Body wave"),
    "salsa-solo": ("dancing/Salsa-Dancing_Female-Salsa-Dancing", "dance", "Salsa solo"),
    "hip-hop": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dancing-Bboy-Variation-One", "dance", "Hip-hop"),
    "side-to-side": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dancing-Side-To-Side", "dance", "Side to side"),
    "samba": ("dancing/Samba-Dancing_Samba-Funky-Pocoto-Variation-1", "dance", "Samba"),
    "house": ("dancing/House-Dancing_House-Dance-Variation-Two", "dance", "House"),
    "shuffle": ("dancing/Shuffling_Doing-The-Shuffling-Dance", "dance", "Shuffle"),
    "charleston": ("dancing/Swing-Dancing_Dance-Swing-Charleston", "dance", "Charleston"),
    "belly-sway": ("dancing/Bellydancing_Bellydance-Variation-2", "dance", "Belly sway"),
    "pagode": ("dancing/Samba-Dancing_Female-Samba-Pagode-Variation-Five-Loop", "dance", "Pagode samba"),
    "rumba": ("dancing/Rumba-Dancing_Female-Rumba-Dancing-Loop", "dance", "Rumba"),
    "arm-wave": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Arm-Wave'-Dancing", "dance", "Arm wave"),
    "kick-step": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Kick-Step'-Dancing", "dance", "Kick step"),
    "raise-the-roof": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Raise-The-Roof'-Dancing", "dance", "Raise the roof"),
    "running-man": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Running-Man'-Dancing", "dance", "Running man"),
    "jazz-square": ("dancing/Jazz-Dancing_Female-Jazz-Square-Dancing", "dance", "Jazz square"),
    "robot": ("dancing/Robot-Hip-Hop-Dance_Robot-Hip-Hop-Dance-Variation-One", "dance", "Robot"),
    "the-twist": ("dancing/Silly-Dancing_Silly-Dancing-The-Twist", "dance", "The twist"),
    "macarena": ("dancing/Macarena-Dance_Dancing-The-Macarena", "dance", "Macarena"),
    "northern-soul": ("dancing/Northern-Soul-Dance_Basic-Northern-Soul-Step", "dance", "Northern soul"),
    "locking": ("dancing/Locking-Hip-Hop-Dance_Locking-Hip-Hop-Dance-Variation-Two", "dance", "Locking"),
    "shy-sway": ("dancing/Hip-Hop-Dancing_Timid-Dancing", "dance", "Shy sway"),
    # emotes: looped like dances, for NPCs only (kept out of the Dance picker)
    "clap": ("gestures/clapping/Clapping_Clap-While-Standing", "emote", "Clapping"),
    "cheer": ("gestures/cheering/Cheering_Male-Cheering-With-Two-Fists-Pump", "emote", "Cheering"),
    "fist-pump": ("gestures/cheering/Fist-Pump_Pumping-A-Fist", "emote", "Fist pump"),
    "wave": ("gestures/waving/Waving-Gesture_Aj-Waving-Gesture", "emote", "Waving"),
    "chatting": ("talking/Talking_General-Conversation", "emote", "Chatting"),
    "bartending": ("drinking/Bartending_Pouring-And-Serving-Drinks", "emote", "Bartending"),
    # held poses: the middle frame of the take
    "pose-arms-down": ("idle/Female-Standing-Pose_Arms-Down", "pose", "Arms down"),
    "pose-over-shoulder": ("idle/Female-Standing-Pose_Hands-On-Hips-Looking-Over-Shoulder", "pose", "Over the shoulder"),
    "pose-arms-raised": ("idle/Female-Standing-Pose_Legs-Crossed-Arms-Raised", "pose", "Arms raised"),
    "pose-wave": ("idle/Female-Standing-Pose_Right-Hand-On-Hip-Left-Arm-Raised-2", "pose", "Hand on hip"),
    "pose-relaxed": ("idle/Idle_Female-Idle", "pose", "Relaxed"),
    "pose-bashful": ("idle/Bashful_Being-Bashful-While-Standing", "pose", "Bashful"),
    "pose-cocky": ("idle/Being-Cocky_Cocky-Lean-Back", "pose", "Cocky"),
    "pose-lean-back": ("idle/Female-Standing-Pose_Leaning-Back-Left-Hand-On-Hip", "pose", "Lean back"),
    "pose-legs-crossed": ("idle/Female-Standing-Pose_Legs-Crossed-Left-Hand-On-Hip", "pose", "Legs crossed"),
    "pose-foot-up": ("idle/Female-Standing-Pose_Right-Foot-Raised", "pose", "Foot up"),
    "pose-thinking": ("idle/Thinking_Thinking-While-Standing", "pose", "Thinking"),
    "pose-phone": ("talking/Talking-On-Phone_Female-Standing-Talking-On-Phone", "pose", "On the phone"),
    "pose-looking-away": ("idle/Female-Standing-Pose_Looking-Down-To-The-Right", "pose", "Looking away"),
    "pose-waiting": ("idle/Male-Standing-Pose_Arms-Behind-Back", "pose", "Waiting"),
    "sit-lean-back": ("sitting/Female-Sitting-Pose_Arms-Supporting", "sit", "Lean back"),
    "sit-elbows": ("sitting/Female-Sitting-Pose_Leaning-Forward-Elbows-On-Knees", "sit", "Elbows on knees"),
    "sit-crossed": ("sitting/Female-Sitting-Pose_Legs-Crossed-Right-Arm-Over-Knee", "sit", "Legs crossed"),
    "sit-chatting": ("talking/Sitting-Talking_Sitting-And-Talking-To-Another-Person", "sit", "Chatting"),
    "sit-reclined": ("sitting/Female-Sitting-Pose_Legs-Crossed-Reclining", "sit", "Reclined"),
    "sit-arms-crossed": ("sitting/Female-Sitting-Pose_Legs-Crossed-Arms-Crossed", "sit", "Arms crossed"),
    "sit-hug-knee": ("sitting/Female-Sitting-Pose_Arms-Holding-Right-Knee", "sit", "Hugging a knee"),
    "sit-at-table": ("sitting/Seated-Idle-With-Hands-On-A-Table", "sit", "At the table"),
    "sit-upright": ("sitting/Sitting-Idle_Sitting-Still-In-A-Chair", "sit", "Upright"),
    "sit-sipping": ("drinking/Sitting-Drinking_Having-A-Seat-And-Drinking-A-Canned-Beverage", "sit", "Sipping"),
    "lay-arched": ("laying/Female-Laying-Pose_Back-Arched-Arms-Supporting", "lay", "Lounging"),
    "lay-side": ("laying/Female-Laying-Pose_On-Right-Side-Right-Hand-Supporting-Head", "lay", "On my side"),
    "lay-stomach": ("laying/Female-Laying-Pose_On-Stomach-Elbows-Supporting", "lay", "On my stomach"),
}
# never: the game has no guns outside game zones and nothing gory
BANNED = ("weapons/", "combat/", "death", "dying", "agony", "hit", "injur", "pain")
# dance loops longer than this repeat a shorter section: the file stays small
MAX_LOOP = 6.5


def still(poses):
    """A held pose: one key, standing in for a 1 s loop."""
    root, joints = poses[len(poses) // 2]
    return 1.0, [{"at": 0, "root": [round(float(x), 3) for x in root], "joints": {b: [round(float(x), 3) for x in v] for b, v in joints.items()}}]


def main():
    clips = []
    for cid, (file, kind, label, window) in CLIPS.items():
        path = os.path.join(CMU, file + ".bvh")
        if not os.path.exists(path):
            print("missing", path)
            continue
        poses, fdt = retarget(*cmu_frames(path))
        s, L = best_loop(poses, fdt, window, kind)
        period, keys = keys_for(poses, fdt, s, L)
        clips.append({"id": cid, "kind": kind, "label": label, "source": f"CMU {file}", "period": period, "keys": keys})
        print(cid, "period", period, "keys", len(keys))
    for cid, (rel, k, label) in MIXAMO_CLIPS.items():
        assert not any(w in rel.lower() for w in BANNED), rel
        frames, fdt = mixamo_frames(os.path.join(MIXAMO, rel + ".fbx"))
        held = k in ("pose", "sit", "lay")
        poses, fdt = retarget(frames, fdt, held)
        dur = len(poses) * fdt
        if held:
            period, keys = still(poses)
        else:
            window = (0.7, min(1.6, dur * 0.9)) if k == "walk" else (min(1.5, dur * 0.4), min(MAX_LOOP, dur * 0.9))
            s, L = best_loop(poses, fdt, window, k)
            period, keys = keys_for(poses, fdt, s, L)
        clips.append({"id": cid, "kind": k, "label": label, "source": "Mixamo", "period": period, "keys": keys})
        print(cid, k, "period", period, "keys", len(keys))
    head = (
        "// Generated by art/doll/blender/mocap.py. CMU clips: CMU Graphics Lab\n"
        "// Motion Capture Database (mocap.cs.cmu.edu), free to copy, modify\n"
        "// and redistribute. Mixamo clips: retargeted from Adobe Mixamo\n"
        "// animations, used in-game under Mixamo's terms. Do not edit by hand.\n"
    )
    meta = [{k: v for k, v in c.items() if k != "keys"} for c in clips]
    dances = [c["id"] for c in clips if c["kind"] == "dance"]
    emotes = [c["id"] for c in clips if c["kind"] == "emote"]
    with open(OUT, "w") as f:
        f.write(
            head + 'import type { MocapClip } from "./mocapTypes.ts";\n\n'
            "// the keys load later, from mocapKeys.ts (see loadMocap in moves.ts)\n"
            f"export const MOCAP_CLIPS: readonly MocapClip[] = {json.dumps(meta)};\n\n"
            f"export const MOCAP_DANCE_IDS = {json.dumps(dances)} as const;\n\n"
            "// looped like dances, for NPCs; not in the player's Dance picker\n"
            f"export const MOCAP_EMOTE_IDS = {json.dumps(emotes)} as const;\n"
        )
    # one line per clip, left out of Prettier, so the file stays small
    with open(KEYS_OUT, "w") as f:
        f.write(head + 'import type { MocapKey } from "./mocapTypes.ts";\n\n')
        f.write("export const MOCAP_KEYS: Record<string, readonly MocapKey[]> = {\n")
        for c in clips:
            f.write(f"  {json.dumps(c['id'])}: {json.dumps(c['keys'], separators=(',', ':'))},\n")
        f.write("};\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
