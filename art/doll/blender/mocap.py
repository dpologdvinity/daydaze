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

Writes .cache/out/anims{-m}.glb and one anims-<pack>{-m}.glb per pack
(mocap_clips.py lists the clips by pack; scripts/optimize-doll.sh compresses
them into public/models/doll/) and, from the woman's run, mocap.ts (ids,
kinds, labels, packs, loop lengths and walk speeds). DOLL_SEX=male bakes the
same clips onto the man's rig (run build_doll.py for him first).
MOCAP_PACKS=core,seated bakes just those packs; `-- id id` bakes just those
clips into anims-test.glb. Sources are Mixamo FBX files or, as "ual1:<action>",
Quaternius' CC0 Universal Animation Library (UAL_DIR holds its unzipped
folders ual1/ and ual2/; its UE bone names map onto Mixamo's by UE_NAMES).

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

# The clip tables live in mocap_clips.py, by pack (core, social, seated, ...).
# Kinds: walk (a gait's loop), back (a backwards walk), idle (standing,
# looped), dance, emote (looped like a dance: NPCs, games and the emote menu),
# pose / sit / lay (held: the middle frame), seat (a looped sit), swim (a
# looped stroke or tread in the sea: the hips keep the take's own height,
# nothing is grounded) and trans (a one-shot: sit down, stand up, a jump).
sys.path.insert(0, HERE)
import mocap_clips  # noqa: E402

CLIPS = {cid: spec for pack in mocap_clips.PACK_ORDER for cid, spec in mocap_clips.PACKS[pack].items()}
PACK_OF = {cid: pack for pack in mocap_clips.PACK_ORDER for cid in mocap_clips.PACKS[pack]}
HELD = ("pose", "sit", "lay")
# never: the game has no guns outside game zones and nothing gory
BANNED = ("weapons/", "combat/", "death", "dying", "agony", "hit", "injur", "pain")
# the one exception: a flinch from a laser or paintball tag (reactions.ts); the
# take is named for a "hit" but is a stagger, nothing injured
FLINCHES = "reactions/Standing-React-Large-From-"


def banned(rel):
    """The banned words in a clip's path, minus the flinch takes' own name."""
    low = rel.lower()
    if rel.startswith(FLINCHES):
        low = low.replace("hit-reaction", "")
    return [w for w in BANNED if w in low]


# a dance or emote longer than this loops a shorter section of itself,
# where its end pose best meets its start (keeps the file small)
MAX_LOOP = 8.0
MIN_LOOP = 3.0


def _ue_names():
    """Quaternius' UE-style rig (Universal Animation Library) -> Mixamo bone
    names, so its clips retarget through the same code as Mixamo's."""
    m = {"pelvis": "Hips", "spine_01": "Spine", "spine_02": "Spine1", "spine_03": "Spine2", "neck_01": "Neck"}
    for side, S in (("l", "Left"), ("r", "Right")):
        m.update({
            f"clavicle_{side}": f"{S}Shoulder", f"upperarm_{side}": f"{S}Arm", f"lowerarm_{side}": f"{S}ForeArm",
            f"hand_{side}": f"{S}Hand", f"thigh_{side}": f"{S}UpLeg", f"calf_{side}": f"{S}Leg",
            f"foot_{side}": f"{S}Foot", f"ball_{side}": f"{S}ToeBase", f"ball_leaf_{side}": f"{S}Toe_End",
        })
        for finger, F in (("thumb", "Thumb"), ("index", "Index"), ("middle", "Middle"), ("ring", "Ring"), ("pinky", "Pinky")):
            for i in (1, 2, 3):
                m[f"{finger}_0{i}_{side}"] = f"{S}Hand{F}{i}"
            m[f"{finger}_04_leaf_{side}"] = f"{S}Hand{F}4"
    return m


UE_NAMES = _ue_names()


def short(name):
    """mixamorig:Hips, mixamorig1:Hips, pelvis -> Hips."""
    bare = name.split(":")[-1]
    return UE_NAMES.get(bare, bare)


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


# clips turned upside down on the head: the floor is under the crown, not the feet
HEAD_DOWN = ("headspin",)


def foot_drop(rig, tgt_rest, world, hips, head_down=False):
    """How far the doll's lowest foot point (ankle, ball or toe tip) sits
    below its own rest height, with the hips at `hips` and the bones turned
    to `world` (forward kinematics from the rest offsets). Negative: sunk
    into the floor; positive: every foot point lifted. `head_down` (a head
    spin) measures the crown's height above the floor instead."""
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
        if head_down:
            if name == "Head":
                tip = (b.tail_local - b.head_local)
                tip_at = head[name] + world[name] @ (tgt_rest[name][0].inverted() @ tip)
                drop = min(drop, tip_at.z)
            continue
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


UAL_DIR = os.environ.get("UAL_DIR", "/tmp")
UAL_FILES = {
    "ual1": "ual1/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb",
    "ual2": "ual2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb",
}
# a UAL file is imported once per run; its actions are picked one at a time
UAL_SOURCES = {}

# transitions that end (or start) seated: their hips anchor on the seat's
# height like a seat's loop, and their feet aren't grounded
SEAT_TRANS = {"sit-down": -1, "sit-down-ual": -1, "stand-up-ual": 0, "type-start": 0, "type-stop": 0}


def open_source(rel):
    """The clip's armature, its action, and a cleanup to call when baked.
    Mixamo clips are one FBX each; UAL clips are actions in one shared GLB."""
    if ":" in rel and rel.split(":")[0] in UAL_FILES:
        lib, name = rel.split(":")
        if lib not in UAL_SOURCES:
            before = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=os.path.join(UAL_DIR, UAL_FILES[lib]))
            new = [o for o in bpy.data.objects if o not in before]
            UAL_SOURCES[lib] = next(o for o in new if o.type == "ARMATURE")
        src = UAL_SOURCES[lib]
        act = next(a for a in bpy.data.actions if a.name == name)
        src.animation_data_create()
        src.animation_data.action = act
        slots = getattr(act, "slots", None)
        if slots and len(slots):
            src.animation_data.action_slot = slots[0]
        return src, act, lambda: None
    src, imported = import_clip(os.path.join(MIXAMO, rel + ".fbx"))
    act = src.animation_data.action

    def cleanup():
        for ob in imported:
            bpy.data.objects.remove(ob)
        bpy.data.actions.remove(act)

    return src, act, cleanup


def import_clip(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    return src, new


# a looped clip whose last pose is farther than this (radians, mean over the
# bones) from its first gets its last half second eased back to the first
LOOP_GAP = 0.05
LOOP_EASE = 12
LOOPED = ("idle", "emote", "dance", "seat")


def mean_gap(a, b):
    """Mean angle between two poses' bone rotations, radians."""
    return sum(a[k].rotation_difference(b[k]).angle for k in a) / max(1, len(a))


def ease_loop(rots, pos):
    """Eases the last LOOP_EASE frames toward frame 0, so a take that ends
    in another pose than it starts (a wave, a nod) loops without a pop."""
    n = len(rots)
    span = min(LOOP_EASE, n // 3)
    for i in range(n - span, n):
        t = (i - (n - span) + 1) / span
        w = t * t * (3 - 2 * t)  # smoothstep
        rots[i] = {k: q.slerp(rots[0][k], w) for k, q in rots[i].items()}
        pos[i] = pos[i].lerp(pos[0], w)


def bake(rig, tgt_rest, cid, rel, kind):
    src, act, cleanup = open_source(rel)
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
    # a swimmer's feet never plant: nothing to tip flat
    fix = {} if kind == "swim" else foot_fix(tgt_rest, heads)
    print(cid, "foot fix", {k: round(v) for k, v in fix.items()})
    n = len(frames)
    if kind in ("dance", "emote", "idle", "swim", "seat") and n / FPS > MAX_LOOP:
        n = best_loop(rots, int(MIN_LOOP * FPS), int(MAX_LOOP * FPS)) + 1
        frames, rots, hips = frames[:n], rots[:n], hips[:n]
    speed = walk_speed(src, f0, f1, k) if kind in ("walk", "back") else None
    seat_anchor = SEAT_TRANS.get(cid)
    # hips: drift off, seats and beds set the height (step 3)
    drift = (hips[-1] - hips[0]) if n > 1 and not held and seat_anchor is None else Vector()
    pos = []
    for i, h in enumerate(hips):
        p = h - drift * (i / max(1, n - 1))
        p.z = h.z
        if kind in ("sit", "seat"):
            p = Vector((hip_t.x, hip_t.y, hip_t.z + SIT_DROP + (h.z - hips[0].z)))
        elif kind == "lay":
            p = Vector((hip_t.x, hip_t.y, hip_t.z + SIT_DROP - SEAT_BELOW_HIPS + h.z))
        elif seat_anchor is not None:
            # the seated end of the transition sits where a seat's loop does
            a = hips[seat_anchor]
            p = Vector((hip_t.x + h.x - a.x, hip_t.y + h.y - a.y, hip_t.z + SIT_DROP + (h.z - a.z)))
        pos.append(p)
    if kind in LOOPED and n > 15 and mean_gap(rots[0], rots[-1]) > LOOP_GAP:
        ease_loop(rots, pos)
        print(cid, "loop eased")
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
        drops.append(foot_drop(rig, tgt_rest, world, pos[i], cid in HEAD_DOWN))
        for name, q in basis.items():
            if name in prev and prev[name].dot(q) < 0:
                q = -q  # same rotation, the side nearer the last key
            prev[name] = q
            rows.setdefault(name, []).append(q)
    # on her feet: the lowest the feet reach over the clip meets the floor
    # (the takes' own rest hips differ, a pose file's most of all)
    if kind not in ("sit", "seat", "lay", "swim") and seat_anchor is None:
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
    cleanup()
    period = round((n - 1) / FPS, 4) if not held else 0
    meta = {
        "id": cid,
        "kind": kind,
        "label": CLIP_LABEL[cid],
        "source": ("UAL " if rel.startswith("ual") else "Mixamo ") + os.path.basename(rel).replace("ual1:", "").replace("ual2:", ""),
        "period": period,
        "pack": PACK_OF[cid],
    }
    if "menu" in CLIPS[cid][3:]:
        meta["menu"] = True
    if speed is not None:
        meta["speed"] = round(speed, 3)
    print(cid, kind, "frames", n, "period", period, "speed", speed)
    return meta


CLIP_LABEL = {cid: spec[2] for cid, spec in CLIPS.items()}
META_DIR = os.path.join(HERE, ".cache", "out")


def export(rig, path):
    for ob in list(bpy.data.objects):
        ob.select_set(ob is rig)
    bpy.context.view_layer.objects.active = rig
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_skins=True,
        export_materials="NONE",
    )


def drop_sources(baked):
    """Removes everything but the baked actions (the UAL files' own actions
    would otherwise export with them) and the imported UAL rigs; the next
    pack imports them afresh."""
    for a in list(bpy.data.actions):
        if a.name not in baked:
            bpy.data.actions.remove(a)
    for src in UAL_SOURCES.values():
        for ob in [src] + list(src.children_recursive):
            bpy.data.objects.remove(ob)
    UAL_SOURCES.clear()


def main():
    """`-- id id ...` bakes just those clips to anims-test.glb (no catalog);
    otherwise every pack in MOCAP_PACKS (default all), one GLB each:
    anims.glb for core, anims-<pack>.glb for the rest ("-m" after for the man)."""
    only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    packs = [x for x in os.environ.get("MOCAP_PACKS", ",".join(mocap_clips.PACK_ORDER)).split(",") if x]
    bpy.ops.wm.open_mainfile(filepath=RIG_BLEND)
    scene = bpy.context.scene
    scene.render.fps = FPS
    rig = bpy.data.objects["Rig"]
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    tgt_rest = rest_of(rig)
    if only:
        todo = [("test", [c for c in CLIPS if c in only])]
    else:
        todo = [(pk, list(mocap_clips.PACKS[pk])) for pk in packs]
    for pack, ids in todo:
        metas = []
        for cid in ids:
            rel = CLIPS[cid][0]
            assert not banned(rel), rel
            metas.append(bake(rig, tgt_rest, cid, rel, CLIPS[cid][1]))
        stem = "anims" if pack == "core" else f"anims-{pack}"
        drop_sources({m["id"] for m in metas})
        export(rig, os.path.join(HERE, ".cache", "out", f"{stem}{SUFFIX}.glb"))
        for a in list(bpy.data.actions):
            bpy.data.actions.remove(a)
        if not only and SEX == "female":
            with open(os.path.join(META_DIR, f"meta-{pack}.json"), "w") as f:
                json.dump(metas, f)
    if not only and SEX == "female":
        write_catalog()


def write_catalog():
    """Writes mocap.ts from the packs' meta files (every pack must have one:
    bake them all on the woman at least once)."""
    head = (
        "// Generated by art/doll/blender/mocap.py. Clips retargeted onto the doll's\n"
        "// own skeleton from Adobe Mixamo animations and Quaternius' Universal\n"
        "// Animation Library (CC0), baked into public/models/doll/anims*.glb (one\n"
        "// file per pack, loaded on demand) and used in-game under Mixamo's terms.\n"
        "// Do not edit by hand.\n"
    )
    metas = []
    for pack in mocap_clips.PACK_ORDER:
        path = os.path.join(META_DIR, f"meta-{pack}.json")
        if not os.path.exists(path):
            print("no meta for", pack, "- catalog not written")
            return
        with open(path) as f:
            metas += json.load(f)
    by = lambda *kinds: [m["id"] for m in metas if m["kind"] in kinds]
    with open(CATALOG, "w") as f:
        f.write(
            head + 'import type { MocapClip } from "./mocapTypes.ts";\n\n'
            "// the keyframes are in the doll's animation files (see anims.ts)\n"
            f"export const MOCAP_CLIPS: readonly MocapClip[] = {json.dumps(metas)};\n\n"
            f"export const MOCAP_DANCE_IDS = {json.dumps(by('dance'))} as const;\n\n"
            "// looped like dances, for NPCs and the emote menu; not in the Dance picker\n"
            f"export const MOCAP_EMOTE_IDS = {json.dumps(by('emote'))} as const;\n"
        )
    print("wrote", CATALOG)


if __name__ == "__main__":
    main()
