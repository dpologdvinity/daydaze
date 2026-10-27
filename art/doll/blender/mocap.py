"""Bakes Mixamo clips onto the doll's own skeleton and writes them as one
animation-only GLB, plus the clip catalog src/game/dance/mocap.ts.

    blender --background --factory-startup --python art/doll/blender/build_doll.py
    blender --background --factory-startup --python art/doll/blender/mocap.py
    scripts/optimize-doll.sh

build_doll.py leaves each doll's bare rig in .cache/rig{-m}.blend: Mixamo's 52
bones (MPFB2's CC0 rig), fitted to the shaped body and resting arms down.
Each clip is retargeted bone for bone, in world space with rest-pose
compensation:

  1. Line the doll's rest bones up with the clip's rest (a T-pose), parent
     first, by the shortest swing of each bone onto the clip bone's
     direction. A bone's offset is the clip's rest frame to that lined-up
     frame, so it soaks up any difference in bone axes and roll (Mixamo's
     feet, toes and thumbs sit 25 to 180 degrees off ours).
  2. Per frame, each doll bone's world rotation is the clip bone's world
     rotation times its offset; local rotations follow, parent to child.
  3. The hips move from rest scaled by the two rigs' leg lengths. Their
     drift across the floor comes off (loops play in place, sway kept); a
     seat or a bed sets the height of a sit or a lie.

Writes .cache/out/anims{-m}.glb (scripts/optimize-doll.sh compresses it into
public/models/doll/) and mocap.ts (ids, kinds, labels, loop lengths and walk
speeds). DOLL_SEX=male bakes the same clips onto the man's rig as
anims-m.glb (run build_doll.py for him first).

The Mixamo library (repo-root mixamo/, a symlink to the user's own copy,
git-ignored): Adobe's terms allow the animations in a game, baked into its
own files, but not redistributing the FBX files. Only the clips below ship.
CMU clips were dropped in the move to this rig (2026-10-26): their BVH
skeleton has no hands, toes or upper spine to match bone for bone, and every
clip id they filled now plays a Mixamo take instead.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
# baked per doll on its own rig: the man's bones share names with the
# woman's but not their rest axes (his neck rests 44 degrees off hers), so a
# clip can't be carried from one to the other after baking
SEX = os.environ.get("DOLL_SEX", "female")
if SEX not in ("female", "male"):
    raise SystemExit(f"DOLL_SEX must be female or male, not {SEX}")
SUFFIX = "-m" if SEX == "male" else ""
RIG_BLEND = os.path.join(HERE, ".cache", f"rig{SUFFIX}.blend")
OUT = os.path.join(HERE, ".cache", "out", f"anims{SUFFIX}.glb")
CATALOG = os.path.join(ROOT, "src", "game", "dance", "mocap.ts")
MIXAMO = os.path.join(ROOT, "mixamo")
FPS = 30

# How far sitting lowers the hips: SIT_DROP in src/client/avatar/pose.ts,
# which every seat is built to. A lying doll rests on a surface this far
# below the seated hips (the hips' own depth).
SIT_DROP = -0.33
SEAT_BELOW_HIPS = 0.1

# clip id -> (path under mixamo/ without .fbx, kind, label). Ids are stable:
# gaits.ts, pickers, NPCs and saved holds name them. Order matters within a
# kind: the first lay clip is the player's lounge, NPCs pick seeded poses
# and idles by index, and the first sit is the default seat.
# Kinds: walk (a gait's loop), idle (standing, looped), dance, emote (looped
# like a dance, NPCs and games only), pose / sit / lay (held: the middle
# frame), and seat (a looped sit).
CLIPS = {
    # walks only play when a gait names them (src/game/gaits.ts)
    # Walks keep the trailing leg long: measured on the takes (knee flex at
    # toe-off / at most, by scripts/mixamo-gait.mjs), these sit near a
    # real walk's ~15 / ~65 degrees; bouncier takes read as jogging.
    "walk-easy": ("walking/styled/Catwalk-Walk-Forward_Female-Walk-Forward", "walk", "Easy"),  # 15 / 60
    "walk-relaxed": ("walking/Standard-Walk_Standard-Walk", "walk", "Relaxed"),  # 20 / 70
    "walk-brisk": ("walking/styled/Strut-Walking_Male-Strut-Walk", "walk", "Brisk"),  # 23 / 76
    "walk-catwalk": ("walking/styled/Catwalk-Walk-Forward-Crossed_Female-Walk-Forward-Legs-Crossing", "walk", "Catwalk"),  # 14 / 67
    "walk-normal": ("walking/Walk_Female-Walk-2", "walk", "Normal"),  # 32 / 67
    "walk-sexy": ("walking/styled/Walking_Female-Sexy-Walk", "walk", "Sexy"),  # 16 / 69
    "walk-feminine": ("walking/styled/Walking-With-A-Swagger-2", "walk", "Feminine"),  # 15 / 75
    "walk-casual": ("walking/styled/Catwalk-Walk-Forward-02_Male-Walk-Forward-02", "walk", "Casual"),  # 21 / 74
    "walk-masc": ("walking/Walking_Male-Standard-Walk", "walk", "Easy stride"),  # 18 / 67
    # standing idles: the player breathes, NPCs pick one by seed
    "idle-breathing": ("idle/Breathing-Idle_Breathing-Idle", "idle", "Breathing"),
    "idle-weight-shift": ("idle/Neutral-Idle_Neutral-Idle", "idle", "Weight shift"),
    "idle-look-around": ("idle/Looking-Around_Idle-Stand-Looking-Around", "idle", "Looking around"),
    "idle-bored": ("idle/Unarmed-Idle-01_Unarmed-Idle", "idle", "Bored"),
    "idle-female": ("idle/Idle_Female-Idle", "idle", "Easy"),
    "idle-happy": ("gestures/emotions/Happy-Idle_Happy-Idle-Variation-1", "idle", "Happy"),
    "salsa": ("dancing/Salsa-Dancing_Salsa-Dancing-Side-To-Side", "dance", "Salsa"),
    "salsa-turns": ("dancing/Salsa-Dancing_Salsa-Dancing-Double-Twirl", "dance", "Salsa turns"),
    "lambada": ("dancing/Salsa-Dancing_Salsa-Dance-Variation-Five", "dance", "Lambada"),
    "expressive": ("dancing/Jazz-Dancing_Female-Jazz-Dancing-'Around-The-World'-Loop", "dance", "Expressive"),
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
    "talk-question": ("talking/Talking_Asking-A-Question-With-One-Hand", "emote", "Asking"),
    "laugh": ("talking/Talking_Talking-Finding-Something-Funny", "emote", "Laughing"),
    "bartending": ("drinking/Bartending_Pouring-And-Serving-Drinks", "emote", "Bartending"),
    # game clips: the player's doll plays these during in-world games
    "dig": ("sports/Receiver-Catch_Receiver-Catch-On-Boundary-Line", "emote", "Dig"),
    "spike": ("sports/Goalie-Throw_Goalie-Overhand-Throw", "emote", "Spike"),
    "sing": ("talking/Singing_Singing-While-Walking-On-Stage", "emote", "Singing"),
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
    # the Lean mood: an elbow on the bar
    "pose-lean": ("idle/Male-Standing-Pose_Left-Elbow-Resting-On-Object", "pose", "Leaning"),
    # a seat's own loop: the default for anyone sitting without a held pose
    "sit-idle": ("sitting/Sitting-Idle_Sitting-With-Breathing-Idle", "seat", "Sitting"),
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
HELD = ("pose", "sit", "lay")
# never: the game has no guns outside game zones and nothing gory
BANNED = ("weapons/", "combat/", "death", "dying", "agony", "hit", "injur", "pain")
# a dance or emote longer than this loops a shorter section of itself,
# where its end pose best meets its start (keeps the file small)
MAX_LOOP = 8.0
MIN_LOOP = 3.0


def short(name):
    """mixamorig:Hips, mixamorig1:Hips -> Hips."""
    return name.split(":")[-1]


# where a bone points: at this child's joint when it has several
LEAD = {"Hips": "Spine", "Spine2": "Neck", "LeftHand": "LeftHandMiddle1", "RightHand": "RightHandMiddle1"}


def rest_of(arm):
    """World-space rest rotation, head and unit direction of each bone.
    The direction runs joint to joint (to the lead child's head), not along
    the bone's own axis: an FBX bone's tail is wherever the importer guessed,
    so only joints compare across rigs. A leaf points at its tail, or at
    Mixamo's *_End / finger-4 marker bone where the clip has one."""
    out = {}
    for b in arm.data.bones:
        name = short(b.name)
        kids = [c for c in b.children if short(c.name) not in ("lEye", "rEye", "pony")]
        lead = next((c for c in kids if short(c.name) == LEAD.get(name)), kids[0] if len(kids) == 1 else None)
        m = arm.matrix_world @ b.matrix_local
        head = arm.matrix_world @ b.head_local
        tip = arm.matrix_world @ (lead.head_local if lead else b.tail_local)
        out[name] = (m.to_3x3().normalized().to_quaternion(), head, (tip - head).normalized())
    return out


def leg_length(rest):
    """Hip joint to knee to ankle, meters, from rest_of()."""
    hip, knee, ankle = (rest[b][1] for b in ("LeftUpLeg", "LeftLeg", "LeftFoot"))
    return (knee - hip).length + (ankle - knee).length


def swing(a, b):
    """The shortest rotation taking unit a onto unit b."""
    return a.rotation_difference(b)


def offsets(rig, tgt_rest, src_rest):
    """Per doll bone: the clip-rest-frame to doll-frame offset, with the
    doll lined up onto the clip's rest pose (step 1 in the module doc)."""
    D = {}
    off = {}
    for b in rig.data.bones:  # parents come before children
        name = short(b.name)
        parent = D.get(short(b.parent.name), Quaternion()) if b.parent else Quaternion()
        if name not in src_rest:
            D[name] = parent
            continue
        q_t, _, d_t = tgt_rest[name]
        q_s, _, d_s = src_rest[name]
        D[name] = swing(parent @ d_t, d_s) @ parent
        off[name] = q_s.inverted() @ (D[name] @ q_t)
    return off


def sample(src, f):
    """The clip's world rotations and hip position at frame f."""
    bpy.context.scene.frame_set(f)
    rot = {}
    for pb in src.pose.bones:
        m = src.matrix_world @ pb.matrix
        rot[short(pb.name)] = m.to_3x3().normalized().to_quaternion()
    head = {short(pb.name): src.matrix_world @ pb.head for pb in src.pose.bones}
    return rot, head["Hips"], head


def foot_fix(tgt_rest, heads):
    """Per foot, degrees to tip it toes-up so it rests as the doll's does.
    Mixamo's women's takes were made in heels: their planted foot points
    ~50 degrees further down than its own rest, which on the doll's bare
    feet reads as tiptoeing (and lifts her body onto her toes). The angle
    is the doll's rest pitch (ankle to ball) less the take's median pitch
    over the frames its ball is on the floor; none planted, no fix."""
    fix = {}
    for side in ("Left", "Right"):
        foot, ball = f"{side}Foot", f"{side}ToeBase"
        pitch = lambda a, b: math.degrees(math.atan2((b - a).z, (b - a).xy.length))
        floor = min(h[ball].z for h in heads)
        planted = sorted(pitch(h[foot], h[ball]) for h in heads if h[ball].z < floor + 0.02 and floor < 0.08)
        if planted:
            rest = pitch(tgt_rest[foot][1], tgt_rest[ball][1])
            fix[foot] = rest - planted[len(planted) // 2]
    return fix


def locals_for(rig, tgt_rest, off, world_src, fix=None):
    """Each doll bone's pose rotation (relative to its rest), from the
    clip's world rotations at one frame (step 2); `fix` tips feet (foot_fix)."""
    world = {}
    basis = {}
    for b in rig.data.bones:
        name = short(b.name)
        q_rest = tgt_rest[name][0]
        if b.parent:
            pn = short(b.parent.name)
            p_world, p_rest = world[pn], tgt_rest[pn][0]
        else:
            p_world = p_rest = Quaternion()
        rest_local = p_rest.inverted() @ q_rest
        if name in off and name in world_src:
            world[name] = world_src[name] @ off[name]
            if fix and abs(fix.get(name, 0)) > 3:
                # about the foot's own side-to-side axis, toes up
                side = q_rest.inverted() @ tgt_rest[name][2].cross(Vector((0, 0, 1))).normalized()
                axis = world[name] @ side
                world[name] = Quaternion(axis, math.radians(fix[name])) @ world[name]
        else:
            # unmatched bones (eyes, pony) keep their rest pose on the parent
            world[name] = p_world @ rest_local
        basis[b.name] = rest_local.inverted() @ (p_world.inverted() @ world[name])
    return basis, world


FEET = ("LeftFoot", "LeftToeBase", "RightFoot", "RightToeBase")


def foot_drop(rig, tgt_rest, world, hips):
    """How far the doll's lowest foot point (ankle, ball or toe tip) sits
    below its own rest height, with the hips at `hips` and the bones turned
    to `world` (forward kinematics from the rest offsets). Negative: sunk
    into the floor; positive: every foot point lifted."""
    head = {}
    drop = float("inf")
    for b in rig.data.bones:
        name = short(b.name)
        if not b.parent:
            head[name] = hips
            continue
        pn = short(b.parent.name)
        offset = tgt_rest[pn][0].inverted() @ (tgt_rest[name][1] - tgt_rest[pn][1])
        head[name] = head[pn] + world[pn] @ offset
        if name in FEET:
            drop = min(drop, head[name].z - tgt_rest[name][1].z)
        if name.endswith("ToeBase"):
            tip = (b.tail_local - b.head_local)
            tip_at = head[name] + world[name] @ (tgt_rest[name][0].inverted() @ tip)
            drop = min(drop, tip_at.z - (b.tail_local.z))
    return drop


def best_loop(frames, lo, hi):
    """The frame count, within [lo, hi], whose pose best meets frame 0."""
    first = frames[0]

    def gap(fr):
        return sum(first[k].rotation_difference(q).angle for k, q in fr.items())

    hi = min(hi, len(frames) - 1)
    lo = min(lo, hi)
    return min(range(lo, hi + 1), key=lambda n: gap(frames[n]))


def walk_speed(src, f0, f1, k):
    """A walk's natural ground speed (m/s, doll scale): how fast a planted
    foot slides back under the hips, the median over the stance frames.
    Works for clips in place and with root motion alike."""
    speeds = []
    for side in ("Left", "Right"):
        bone = next(pb for pb in src.pose.bones if short(pb.name) == f"{side}ToeBase")
        hips = next(pb for pb in src.pose.bones if short(pb.name) == "Hips")
        track = []
        for f in range(f0, f1 + 1):
            bpy.context.scene.frame_set(f)
            foot = src.matrix_world @ bone.head
            hip = src.matrix_world @ hips.head
            # Blender's forward is -Y
            track.append((foot.z, -(foot.y - hip.y)))
        low = min(z for z, _ in track)
        for (z0, y0), (z1, y1) in zip(track, track[1:]):
            if z0 < low + 0.03 / k and z1 < low + 0.03 / k:
                speeds.append(abs(y1 - y0) * FPS * k)
    speeds.sort()
    return speeds[len(speeds) // 2] if speeds else 0.0


def import_clip(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    return src, new


def bake(rig, tgt_rest, cid, rel, kind):
    path = os.path.join(MIXAMO, rel + ".fbx")
    src, imported = import_clip(path)
    act = src.animation_data.action
    f0, f1 = (int(round(x)) for x in act.frame_range)
    src_rest = rest_of(src)
    off = offsets(rig, tgt_rest, src_rest)
    hip_t = tgt_rest["Hips"][1]
    hip_s = src_rest["Hips"][1]
    # step 3: the hips move from rest scaled by leg length, so the same knee
    # bend drops them the same share and planted feet stay on the floor
    k = leg_length(tgt_rest) / leg_length(src_rest)
    held = kind in HELD
    frames = [(f0 + f1) // 2] * 2 if held else list(range(f0, f1 + 1))
    rots, hips = [], []
    heads = []
    for f in frames:
        r, h, head = sample(src, f)
        rots.append(r)
        heads.append(head)
        hips.append(hip_t + (h - hip_s) * k)
    fix = foot_fix(tgt_rest, heads)
    print(cid, "foot fix", {k: round(v) for k, v in fix.items()})
    n = len(frames)
    if kind in ("dance", "emote", "idle") and n / FPS > MAX_LOOP:
        n = best_loop(rots, int(MIN_LOOP * FPS), int(MAX_LOOP * FPS)) + 1
        frames, rots, hips = frames[:n], rots[:n], hips[:n]
    speed = walk_speed(src, f0, f1, k) if kind == "walk" else None
    # hips: drift off, seats and beds set the height (step 3)
    drift = (hips[-1] - hips[0]) if n > 1 and not held else Vector()
    pos = []
    for i, h in enumerate(hips):
        p = h - drift * (i / max(1, n - 1))
        p.z = h.z
        if kind in ("sit", "seat"):
            p = Vector((hip_t.x, hip_t.y, hip_t.z + SIT_DROP + (h.z - hips[0].z)))
        elif kind == "lay":
            p = Vector((hip_t.x, hip_t.y, hip_t.z + SIT_DROP - SEAT_BELOW_HIPS + h.z))
        pos.append(p)
    # keys: rotations per bone, the hips' location in its rest frame
    action = bpy.data.actions.new(cid)
    rig.animation_data_create()
    rig.animation_data.action = action
    hip_bone = next(b for b in rig.data.bones if short(b.name) == "Hips")
    hip_rest = tgt_rest["Hips"][0]
    prev = {}
    rows = {}
    drops = []
    for i in range(n):
        basis, world = locals_for(rig, tgt_rest, off, rots[i], fix)
        drops.append(foot_drop(rig, tgt_rest, world, pos[i]))
        for name, q in basis.items():
            if name in prev and prev[name].dot(q) < 0:
                q = -q  # same rotation, the side nearer the last key
            prev[name] = q
            rows.setdefault(name, []).append(q)
    # on her feet: the lowest the feet reach over the clip meets the floor
    # (the takes' own rest hips differ, a pose file's most of all)
    if kind not in ("sit", "seat", "lay"):
        lift = -min(drops)
        print(cid, "grounded by", round(lift, 3))
        for p in pos:
            p.z += lift
    loc = [hip_rest.inverted() @ (p - hip_t) for p in pos]
    for name, qs in rows.items():
        # fingers are 30 of the 55 bones but barely read at play distance:
        # only held poses (two keys each) keep them; loops leave the hands
        # at rest, which are relaxed and a little curled
        if not held and "Hand" in name and short(name)[-1].isdigit():
            continue
        dp = f'pose.bones["{name}"].rotation_quaternion'
        for c in range(4):
            fc = action.fcurve_ensure_for_datablock(rig, dp, index=c)
            fc.keyframe_points.add(n)
            fc.keyframe_points.foreach_set("co", [v for i, q in enumerate(qs) for v in (i, q[c])])
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
    dp = f'pose.bones["{hip_bone.name}"].location'
    for c in range(3):
        fc = action.fcurve_ensure_for_datablock(rig, dp, index=c)
        fc.keyframe_points.add(n)
        fc.keyframe_points.foreach_set("co", [v for i, p in enumerate(loc) for v in (i, p[c])])
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    action.use_fake_user = True
    rig.animation_data.action = None
    for ob in imported:
        bpy.data.objects.remove(ob)
    bpy.data.actions.remove(act)
    period = round((n - 1) / FPS, 4) if not held else 0
    meta = {
        "id": cid,
        "kind": kind,
        "label": CLIP_LABEL[cid],
        "source": "Mixamo " + os.path.basename(rel),
        "period": period,
    }
    if speed is not None:
        meta["speed"] = round(speed, 3)
    print(cid, kind, "frames", n, "period", period, "speed", speed)
    return meta


CLIP_LABEL = {cid: label for cid, (_, _, label) in CLIPS.items()}


def main():
    only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    bpy.ops.wm.open_mainfile(filepath=RIG_BLEND)
    scene = bpy.context.scene
    scene.render.fps = FPS
    rig = bpy.data.objects["Rig"]
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    tgt_rest = rest_of(rig)
    metas = []
    for cid, (rel, kind, _) in CLIPS.items():
        if only and cid not in only:
            continue
        assert not any(w in rel.lower() for w in BANNED), rel
        metas.append(bake(rig, tgt_rest, cid, rel, kind))
    for ob in list(bpy.data.objects):
        ob.select_set(ob is rig)
    bpy.context.view_layer.objects.active = rig
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_skins=True,
        export_materials="NONE",
    )
    if not only and SEX == "female":
        write_catalog(metas)


def write_catalog(metas):
    head = (
        "// Generated by art/doll/blender/mocap.py. Mixamo clips: retargeted from\n"
        "// Adobe Mixamo animations onto the doll's own skeleton and baked into\n"
        "// public/models/doll/anims*.glb, used in-game under Mixamo's terms.\n"
        "// Do not edit by hand.\n"
    )
    by = lambda *kinds: [m["id"] for m in metas if m["kind"] in kinds]
    with open(CATALOG, "w") as f:
        f.write(
            head + 'import type { MocapClip } from "./mocapTypes.ts";\n\n'
            "// the keyframes are in the doll's animation file (see HumanDoll.tsx)\n"
            f"export const MOCAP_CLIPS: readonly MocapClip[] = {json.dumps(metas)};\n\n"
            f"export const MOCAP_DANCE_IDS = {json.dumps(by('dance'))} as const;\n\n"
            "// looped like dances, for NPCs; not in the player's Dance picker\n"
            f"export const MOCAP_EMOTE_IDS = {json.dumps(by('emote'))} as const;\n"
        )
    print("wrote", CATALOG)


if __name__ == "__main__":
    main()
