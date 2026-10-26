"""Builds public/models/doll.raw.glb: the Daydaze doll, from MakeHuman's CC0 base.

    art/doll/blender/fetch_makehuman.sh
    blender --background --factory-startup --python art/doll/blender/build_doll.py

The rig matches src/client/avatar/pose.ts: every bone rests with an identity
rotation (bones point straight up), so the pose code's Euler angles mean what
they meant on the old group rig. The front of the face gets a planar UV
projection that the client paints makeup onto; the rest of the skin samples a
plain corner of the same texture.
"""

import json
from types import SimpleNamespace
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import doll_hair  # noqa: E402
import doll_outfits  # noqa: E402
import proxies  # noqa: E402

MH = os.path.join(HERE, ".cache", "mh")
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
# raw exports; scripts/optimize-doll.sh compresses them into public/models/doll/
OUT_DIR = os.path.join(HERE, ".cache", "out")

# ------------------------------------------------------------------ MakeHuman


def load_obj():
    verts, uvs, faces = [], [], {}
    group = None
    with open(os.path.join(MH, "3dobjs", "base.obj")) as f:
        for line in f:
            p = line.split()
            if not p:
                continue
            if p[0] == "v":
                verts.append([float(x) for x in p[1:4]])
            elif p[0] == "vt":
                uvs.append([float(x) for x in p[1:3]])
            elif p[0] == "g":
                group = p[1]
            elif p[0] == "f":
                faces.setdefault(group, []).append(
                    [int(c.split("/")[0]) - 1 for c in p[1:]]
                )
    return np.array(verts), faces


def target(path):
    d = np.zeros_like(BASE)
    with open(os.path.join(MH, "targets", path)) as f:
        for line in f:
            p = line.split()
            if not p or p[0].startswith("#"):
                continue
            d[int(p[0])] = [float(x) for x in p[1:4]]
    return d


def pair(name):
    """A left and right target pair, e.g. eyes/{s}-eye-scale-incr."""
    return target(name.format(s="l")) + target(name.format(s="r"))


BASE, FACES = load_obj()
UNI = "macrodetails/universal-female-young-"
AVG = target(UNI + "averagemuscle-averageweight.target")

# The house look: a young adult woman with glam proportions. Each entry is a
# CC0 target and its weight; tune here, not in the client.
SHAPE = [
    (AVG, 1.0),
    (target("macrodetails/african-female-young.target"), 1 / 3),
    (target("macrodetails/asian-female-young.target"), 1 / 3),
    (target("macrodetails/caucasian-female-young.target"), 1 / 3),
    (
        target(
            "macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target"
        ),
        1.0,
    ),
    (
        target(
            "macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target"
        ),
        0.2,
    ),
    (
        target(
            "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target"
        ),
        0.3,
    ),
    (target("bodyshapes/bodyshapes-elvs-fem-neat-hourglass.target"), 0.35),
    # a woman's build, not an athlete's: softer muscle, softer arms, wider
    # hips, fuller bum and thighs, a lifted bust. The shoulders keep a real
    # width (joints ~0.33 m apart, not 0.29: narrowing them made the neck look
    # long and the head look pinned on), and the neck is a touch shorter.
    (target(UNI + "minmuscle-averageweight.target") - AVG, 0.5),
    (target("torso/torso-vshape-incr.target"), 0.25),
    (target("neck/neck-scale-vert-decr.target"), 0.3),
    (pair("armslegs/{s}-upperarm-muscle-decr.target"), 0.5),
    (pair("armslegs/{s}-upperarm-shoulder-muscle-decr.target"), 0.2),
    (pair("armslegs/{s}-lowerarm-muscle-decr.target"), 0.5),
    (target("hip/hip-scale-horiz-incr.target"), 0.08),
    (target("buttocks/buttocks-volume-incr.target"), 0.25),
    (pair("armslegs/{s}-upperleg-fat-incr.target"), 0.1),
    (pair("armslegs/{s}-upperleg-muscle-decr.target"), 0.4),
    (target("breast/breast-volume-vert-up.target"), 0.15),
    (target("hip/hip-waist-up.target"), 0.15),
    (target("stomach/stomach-tone-incr.target"), 0.15),
    (pair("eyes/{s}-eye-scale-incr.target"), 0.9),
    (pair("eyes/{s}-eye-bag-decr.target"), 0.6),
    # doll glam: outer corners lifted into an almond cat-eye
    (pair("eyes/{s}-eye-corner2-up.target"), 0.45),
    (pair("eyes/{s}-eye-height2-incr.target"), 0.3),
    (target("nose/nose-volume-decr.target"), 0.5),
    (target("nose/nose-point-width-decr.target"), 0.5),
    (target("nose/nose-point-up.target"), 0.6),
    # natural fullness; the Lip fullness slider and the Full preset add more
    (target("mouth/mouth-upperlip-volume-incr.target"), 0.15),
    (target("mouth/mouth-lowerlip-volume-incr.target"), 0.1),
    (target("mouth/mouth-cupidsbow-incr.target"), 0.5),
    (target("mouth/mouth-scale-horiz-decr.target"), 0.1),
    (pair("cheek/{s}-cheek-bones-incr.target"), 0.7),
        (target("chin/chin-prominent-decr.target"), 0.5),
    (target("head/head-oval.target"), 0.45),
    (target("head/head-fat-decr.target"), 0.3),
    (target("neck/neck-scale-horiz-decr.target"), 0.6),
    # doll glam: a tiny button nose, a V jaw and pointed chin, soft young
    # cheeks, a pout, and tall almond eyes
    (target("nose/nose-scale-horiz-decr.target"), 0.4),
    (target("nose/nose-scale-vert-decr.target"), 0.25),
    (target("nose/nose-scale-depth-decr.target"), 0.25),
    (target("nose/nose-nostrils-width-decr.target"), 0.4),
    (target("nose/nose-width1-decr.target"), 0.3),
    (target("nose/nose-width2-decr.target"), 0.3),
    (target("chin/chin-width-decr.target"), 0.3),
    (target("chin/chin-height-decr.target"), 0.15),
    (target("chin/chin-triangle.target"), 0.0),
    (target("head/head-invertedtriangular.target"), 0.2),
    (target("head/head-age-decr.target"), 0.2),
    (pair("cheek/{s}-cheek-volume-decr.target"), 0.3),
    (pair("cheek/{s}-cheek-inner-decr.target"), 0.0),
    (target("mouth/mouth-upperlip-ext-up.target"), 0.0),
    (target("mouth/mouth-lowerlip-height-incr.target"), 0.0),
    (target("mouth/mouth-angles-up.target"), 0.25),
    (pair("eyes/{s}-eye-height1-incr.target"), 0.0),
    (pair("eyes/{s}-eye-eyefold-up.target"), 0.0),
]
P = BASE + sum(t * w for t, w in SHAPE)


def _centre(group):
    return P[sorted({i for f in FACES[group] for i in f})].mean(axis=0)


def _falloff(points, centre, radius):
    """1 at the centre easing to 0 at `radius` (MakeHuman decimetres)."""
    d = np.linalg.norm(points - centre, axis=1) / radius
    t = np.clip(1 - d, 0, 1)
    return t * t * (3 - 2 * t)


def refine(P):
    """Gentle refinements sculpted straight onto the shaped mesh with smooth
    falloffs, where stacking MakeHuman targets turns uncanny: slightly fuller
    lips, a finer nose and a softly tapered jaw. MakeHuman space: y up,
    z forward."""
    P = P.copy()
    lips = np.abs(target("mouth/mouth-upperlip-volume-incr.target")).sum(1) + np.abs(
        target("mouth/mouth-lowerlip-volume-incr.target")
    ).sum(1)
    mouth = P[lips > lips.max() * 0.2].mean(axis=0)
    w = _falloff(P, mouth, 0.45)[:, None]
    P = P + (P - mouth) * np.array([0.04, 0.05, 0.0]) * w
    nose_w = np.abs(target("nose/nose-volume-decr.target")).sum(1)
    nose = P[nose_w > nose_w.max() * 0.3].mean(axis=0)
    w = _falloff(P, nose, 0.42)[:, None]
    P = P + (P - nose) * -0.1 * w
    # taper the lower face from the mouth down to the chin
    below = np.clip((mouth[1] - P[:, 1]) / 0.55, 0, 1) * _falloff(P, mouth, 1.1)
    P[:, 0] = P[:, 0] - (P[:, 0] - mouth[0]) * 0.08 * below
    return P


P = refine(P)

# Shape keys the client drives. Face sliders run -1..1, so a negative influence
# undoes the target; body keys run 0..1.
KEYS = {
    "eyeSize": pair("eyes/{s}-eye-scale-incr.target") * 0.8,
    "eyeTilt": pair("eyes/{s}-eye-corner2-up.target") * 0.8,
    "nose": target("nose/nose-scale-horiz-incr.target") * 0.8,
    "lips": (
        target("mouth/mouth-upperlip-volume-incr.target")
        + target("mouth/mouth-lowerlip-volume-incr.target")
    )
    * 0.7,
    "cheeks": pair("cheek/{s}-cheek-bones-incr.target") * 0.8,
    "jaw": target("chin/chin-width-incr.target") * 0.8,
    "curvy": (target(UNI + "averagemuscle-maxweight.target") - AVG) * 0.4
    + target("bodyshapes/bodyshapes-elvs-fem-full-hourglass.target") * 0.4
    + target("buttocks/buttocks-volume-incr.target") * 0.3
    + target("hip/hip-scale-horiz-incr.target") * 0.15,
    "slim": (target(UNI + "averagemuscle-minweight.target") - AVG) * 0.6
    + target("bodyshapes/bodyshapes-elvs-fem-lean-column.target") * 0.4,
    "athletic": (target(UNI + "maxmuscle-averageweight.target") - AVG) * 0.6,
    "blink": target("expression/units/caucasian/eye-left-closure.target")
    + target("expression/units/caucasian/eye-right-closure.target"),
    "smile": target("expression/units/caucasian/mouth-corner-puller.target") * 0.5,
}

SKEL = json.load(open(os.path.join(MH, "rigs", "default.mhskel")))
MHW = json.load(open(os.path.join(MH, "rigs", "default_weights.mhw")))["weights"]


def joint(name, pts=None):
    idx = SKEL["joints"][name]
    return (P if pts is None else pts)[idx].mean(axis=0)


def bone_head(b):
    return joint(SKEL["bones"][b]["head"])


def bone_tail(b):
    return joint(SKEL["bones"][b]["tail"])


# --------------------------------------------------------------- the rig

# Our joints, at MakeHuman bone heads (MakeHuman space, decimetres).
BONES = ["body", "head", "lEye", "rEye", "pony"]
for s, S in (("l", "L"), ("r", "R")):
    BONES += [s + "Arm", s + "Fore", s + "Leg", s + "Shin", s + "Foot"]

PARENT = {
    "body": None,
    "head": "body",
    "lEye": "head",
    "rEye": "head",
    "pony": "head",
}
for s in "lr":
    PARENT.update(
        {
            s + "Arm": "body",
            s + "Fore": s + "Arm",
            s + "Leg": "body",
            s + "Shin": s + "Leg",
            s + "Foot": s + "Shin",
        }
    )


def ours(mh_bone):
    """Which of our bones a MakeHuman bone's weight goes to, with a share."""
    side = "l" if mh_bone.endswith(".L") else "r"
    if mh_bone.startswith(("upperarm",)):
        return [(side + "Arm", 1.0)]
    if mh_bone.startswith(
        ("lowerarm", "wrist", "metacarpal", "finger")
    ):
        return [(side + "Fore", 1.0)]
    if mh_bone.startswith("upperleg"):
        return [(side + "Leg", 1.0)]
    if mh_bone.startswith("lowerleg"):
        return [(side + "Shin", 1.0)]
    if mh_bone.startswith(("foot", "toe")):
        return [(side + "Foot", 1.0)]
    if mh_bone == "neck01":
        return [("head", 0.15), ("body", 0.85)]
    if mh_bone == "neck02":
        return [("head", 0.55), ("body", 0.45)]
    if mh_bone.startswith(("root", "spine", "pelvis", "clavicle", "breast")):
        return [("body", 1.0)]
    if mh_bone.startswith("shoulder"):
        return [("body", 0.55), (side + "Arm", 0.45)]
    return [("head", 1.0)]


N = len(P)
W = np.zeros((N, len(BONES)))
for mb, pairs in MHW.items():
    for target_bone, share in ours(mb):
        bi = BONES.index(target_bone)
        for vi, w in pairs:
            W[vi, bi] += w * share
W[W.sum(axis=1) == 0, BONES.index("body")] = 1
W /= W.sum(axis=1, keepdims=True)

J = {
    "body": np.zeros(3),
    "head": bone_head("neck01") * 0.4 + bone_head("neck03") * 0.6,
    "lEye": bone_head("eye.L"),
    "rEye": bone_head("eye.R"),
}
for s, S in (("l", "L"), ("r", "R")):
    J[s + "Arm"] = bone_head(f"upperarm01.{S}")
    J[s + "Fore"] = bone_head(f"lowerarm01.{S}")
    J[s + "Leg"] = bone_head(f"upperleg02.{S}")
    J[s + "Shin"] = bone_head(f"lowerleg01.{S}")
    J[s + "Foot"] = bone_head(f"foot.{S}")
WRIST = {s: bone_head(f"wrist.{S}") for s, S in (("l", "L"), ("r", "R"))}

# Closet face presets (FACE_PRESETS in src/game/look.ts): one key each, at 1
# when picked. The default of each group (almond eyes, straight nose, natural
# lips, oval face) is the base mesh and has no key.
KEYS.update(
    {
        "eye_round": pair("eyes/{s}-eye-height1-incr.target") * 0.6
        + pair("eyes/{s}-eye-height2-incr.target") * 0.5,
        "eye_hooded": pair("eyes/{s}-eye-eyefold-down.target") * 0.7
        + pair("eyes/{s}-eye-height2-decr.target") * 0.3,
        "eye_upturned": pair("eyes/{s}-eye-corner2-up.target") * 0.8,
        "eye_downturned": pair("eyes/{s}-eye-corner2-down.target") * 0.7,
        "nose_button": target("nose/nose-point-up.target") * 0.6
        + target("nose/nose-scale-vert-decr.target") * 0.4
        + target("nose/nose-volume-decr.target") * 0.3,
        "nose_narrow": target("nose/nose-width1-decr.target") * 0.6
        + target("nose/nose-width2-decr.target") * 0.6
        + target("nose/nose-width3-decr.target") * 0.6
        + target("nose/nose-scale-horiz-decr.target") * 0.4,
        "nose_wide": target("nose/nose-scale-horiz-incr.target") * 0.6
        + target("nose/nose-nostrils-width-incr.target") * 0.5
        + target("nose/nose-flaring-incr.target") * 0.3,
        "nose_roman": target("nose/nose-hump-incr.target") * 0.6
        + target("nose/nose-point-down.target") * 0.3,
        "lips_full": target("mouth/mouth-upperlip-volume-incr.target") * 0.6
        + target("mouth/mouth-lowerlip-volume-incr.target") * 0.55,
        "lips_thin": target("mouth/mouth-upperlip-volume-decr.target") * 0.5
        + target("mouth/mouth-lowerlip-volume-decr.target") * 0.5,
        "lips_heart": target("mouth/mouth-cupidsbow-incr.target") * 0.8
        + target("mouth/mouth-upperlip-volume-incr.target") * 0.35
        + target("mouth/mouth-scale-horiz-decr.target") * 0.3,
        "lips_wide": target("mouth/mouth-scale-horiz-incr.target") * 0.6,
        "face_round": target("head/head-round.target") * 0.6
        + target("head/head-fat-incr.target") * 0.3,
        "face_heart": target("head/head-invertedtriangular.target") * 0.6
        + target("chin/chin-width-decr.target") * 0.4,
        "face_square": target("head/head-square.target") * 0.6
        + target("chin/chin-width-incr.target") * 0.3,
        "face_diamond": target("head/head-diamond.target") * 0.6,
    }
)

# Closet body sliders (src/game/body.ts): bust, hips and waist keys, driven
# -1..1 by the client. The waist key is the hip-width target masked to a band
# around the natural waist, so it narrows or widens only the middle.
_hip_y = J["lLeg"][1]
_shoulder_y = J["lArm"][1]
_waist_y = _hip_y + 0.35 * (_shoulder_y - _hip_y)
_band = 0.12 * (_shoulder_y - _hip_y)
_waist_mask = np.exp(-(((P[:, 1] - _waist_y) / _band) ** 2))[:, None]
KEYS["bust"] = target(
    "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target"
) * 0.7
KEYS["hips"] = (
    target("hip/hip-scale-horiz-incr.target") * 0.6
    + target("buttocks/buttocks-volume-incr.target") * 0.6
)
KEYS["waist"] = target("hip/hip-scale-horiz-incr.target") * 1.4 * _waist_mask

# ------------------------------------------------------------- re-posing


def rot_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def about(R, pivot):
    """4x4 rotating about a pivot point."""
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = pivot - R @ pivot
    return M


def repose():
    """Arms down by the sides and legs together, from MakeHuman's A-pose."""
    global P
    T = {b: np.eye(4) for b in BONES}
    for s in "lr":
        sign = 1 if s == "l" else -1
        sh, el, wr = J[s + "Arm"], J[s + "Fore"], WRIST[s]
        # straighten the elbow, then swing the whole arm down
        Rf = rot_between(wr - el, el - sh)
        fore = about(Rf, el)
        wr2 = (fore @ np.append(wr, 1))[:3]
        # a little out from the hips, so hands clear the curves
        down = np.array([sign * 0.3, -1.0, 0.04])
        Ra = rot_between(wr2 - sh, down)
        arm = about(Ra, sh)
        T[s + "Arm"] = arm
        T[s + "Fore"] = arm @ fore
        hip, knee, ankle = J[s + "Leg"], J[s + "Shin"], J[s + "Foot"]
        legdown = np.array([sign * 0.035, -1.0, 0.0])
        Rl = rot_between(ankle - hip, legdown)
        leg = about(Rl, hip)
        for b in (s + "Leg", s + "Shin", s + "Foot"):
            T[b] = leg
    M = np.stack([T[b] for b in BONES])  # B x 4 x 4
    blend = np.einsum("nb,bij->nij", W, M)
    P = np.einsum("nij,nj->ni", blend[:, :3, :3], P) + blend[:, :3, 3]
    for k in KEYS:
        KEYS[k] = np.einsum("nij,nj->ni", blend[:, :3, :3], KEYS[k])
    for b in BONES:
        if b in J:
            J[b] = (T[b] @ np.append(J[b], 1))[:3]


repose()

# MakeHuman is Y-up in decimetres; Blender is Z-up in metres, front at -Y.
_body_y = P[sorted({i for f in FACES["body"] for i in f})][:, 1]
GROUND = _body_y.min()
HEIGHT = 1.66  # metres, barefoot; heels add about 7 cm
SCALE = HEIGHT / (_body_y.max() - GROUND)


def to_blender(a, offset=True):
    a = np.atleast_2d(a)
    out = np.stack([a[:, 0], -a[:, 2], a[:, 1] - (GROUND if offset else 0)], 1)
    return out * SCALE


PB = to_blender(P)
KB = {k: to_blender(d, offset=False) for k, d in KEYS.items()}
JB = {b: to_blender(p)[0] for b, p in J.items()}
JB["body"] = np.zeros(3)
JB["pony"] = JB["head"] + np.array([0, 0.09, 0.2])


def eye_sphere(group):
    pts = to_blender(P[sorted({i for f in FACES[group] for i in f})])
    c = pts.mean(0)
    return c, float(np.linalg.norm(pts - c, axis=1).mean())


EYE = {"lEye": eye_sphere("helper-l-eye"), "rEye": eye_sphere("helper-r-eye")}
JB["lEye"], JB["rEye"] = EYE["lEye"][0], EYE["rEye"][0]

# ------------------------------------------------------------ the meshes


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def new_object(name, verts, faces, mat_slots=()):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in mat_slots:
        me.materials.append(material(m))
    return ob


# Distinct colours keep glTF optimisers from merging the materials into one;
# the client swaps every material by name anyway.
COLOURS = {
    "skin": (0.8, 0.6, 0.5, 1),
    "lashes": (0.02, 0.01, 0.01, 1),
    "eye": (0.95, 0.95, 0.95, 1),
    "cornea": (1, 1, 1, 0.1),
}


def material(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        if name in COLOURS:
            m.use_nodes = True
            bsdf = m.node_tree.nodes["Principled BSDF"]
            bsdf.inputs["Base Color"].default_value = COLOURS[name]
            bsdf.inputs["Alpha"].default_value = COLOURS[name][3]
    return m


def build_body():
    """The skin mesh: body faces plus lash cards, one object for shared keys."""
    faces = FACES["body"]
    used = sorted({i for f in faces for i in f})
    remap = {old: new for new, old in enumerate(used)}
    verts = PB[used]
    fl = [[remap[i] for i in f] for f in faces]
    ob = new_object("Body", verts, fl, ["skin", "lashes"])
    src = np.array(used)
    lash_src = add_lashes(ob, src)
    src = np.concatenate([src, lash_src])
    global BODY_SRC
    BODY_SRC = src
    face_uvs(ob, src)
    global MARKS
    MARKS = face_maps(ob, src)
    weights(ob, src)
    shape_keys(ob, src)
    return ob


def lid_line(group, upper, bins=12):
    """A smooth lid-margin polyline from MakeHuman's lash helper strip, which
    sits on the margin: per x bin, the helper verts nearest the opening.
    Runs inner corner -> outer corner."""
    pts = to_blender(P[sorted({i for f in FACES[group] for i in f})])
    outward = 1 if pts[:, 0].mean() > 0 else -1
    xs = pts[:, 0] * outward
    edges = np.linspace(xs.min(), xs.max() + 1e-9, bins + 1)
    line = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        sel = pts[(xs >= lo) & (xs < hi)]
        if not len(sel):
            continue
        z = sel[:, 2]
        near = sel[z <= np.quantile(z, 0.35)] if upper else sel[z >= np.quantile(z, 0.65)]
        line.append(near.mean(0))
    return np.array(line)


LASH_LEN = 0.0145
LIDS = {}
LASH_BASE = 10**9


def add_lashes(ob, src):
    """Upper-lid lash cards along each eye opening, outer lashes longer."""
    global LASH_BASE
    me = ob.data
    co = np.array([v.co[:] for v in me.vertices])
    new_v, new_f, new_src, uvs = [], [], [], []
    n0 = LASH_BASE = len(co)
    for eye in ("lEye", "rEye"):
        c = JB[eye]
        side = "l" if eye == "lEye" else "r"
        upper = lid_line(f"helper-{side}-eyelashes-2", True)
        lower = lid_line(f"helper-{side}-eyelashes-1", False)
        outward = 1 if c[0] > 0 else -1
        LIDS[eye] = (upper, lower)
        seg = np.linalg.norm(np.diff(upper, axis=0), axis=1)
        along = np.concatenate([[0], np.cumsum(seg)]) / seg.sum()
        base = len(new_v) + n0
        for k, p in enumerate(upper):
            t = along[k]
            radial = p - c
            radial[1] = min(radial[1], 0)
            radial /= np.linalg.norm(radial)
            # sweep up, out and forward; flick at the outer corner
            d = radial * 0.6 + np.array([outward * 0.35 * t, -0.45, 0.55])
            d /= np.linalg.norm(d)
            length = LASH_LEN * (0.55 + 0.75 * t**1.4)
            new_v += [p - radial * 0.0004, p + d * length]
            # lash verts ride their nearest skin vert's weights and keys
            mi = src[np.linalg.norm(co - p, axis=1).argmin()]
            new_src += [mi, mi]
            uvs += [(t, 0.0), (t, 1.0)]
        for k in range(len(upper) - 1):
            a = base + 2 * k
            new_f.append((a, a + 2, a + 3, a + 1))
    bm = bmesh.new()
    bm.from_mesh(me)
    bverts = [bm.verts.new(v) for v in new_v]
    bm.verts.ensure_lookup_table()
    uv = bm.loops.layers.uv.verify()
    for f in new_f:
        face = bm.faces.new([bverts[i - n0] for i in f])
        face.material_index = 1
        for loop in face.loops:
            loop[uv].uv = uvs[bverts.index(loop.vert)]
    bm.to_mesh(me)
    bm.free()
    ob["lashUv"] = True
    return np.array(new_src)


def face_uvs(ob, src, head=None):
    """Front-of-face faces get a planar UV (x, z); everything else samples a
    plain-skin corner. The bounds go to the client as `faceRect`. `head` is
    each vertex's head-bone weight (default: from the base mesh via src)."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = me.uv_layers.active.data
    co = np.array([v.co[:] for v in me.vertices])
    if head is None:
        head = W[src, BONES.index("head")]
    eye = (JB["lEye"] + JB["rEye"]) / 2
    half = 0.105
    cx, cz = 0.0, eye[2] - 0.035
    x0, z0 = cx - half, cz - half
    size = 2 * half
    for poly in me.polygons:
        if poly.material_index != 0:
            continue
        idx = list(poly.vertices)
        n = poly.normal
        front = (
            all(head[i] > 0.98 for i in idx)
            and -n.y > 0.25
            and all(co[i][1] < eye[1] + 0.035 for i in idx)
        )
        for li in poly.loop_indices:
            p = co[me.loops[li].vertex_index]
            uv[li].uv = (
                ((p[0] - x0) / size, (p[2] - z0) / size)
                if front
                else (0.004, 0.004)
            )
    ob["faceRect"] = [x0, z0, size]


MASK_RES = 512
MASK_OUT = os.path.join(ROOT, "public", "models", "doll-face.png")


def to_canvas(p, rect):
    """Blender point -> face canvas (0..1, y down), as the client paints."""
    x0, z0, size = rect
    return [(p[0] - x0) / size, 1 - (p[2] - z0) / size]


def raster(ob, values):
    """Rasterises per-vertex values over the front-of-face UVs."""
    img = np.zeros((MASK_RES, MASK_RES))
    me = ob.data
    uvl = me.uv_layers.active.data
    ys, xs = np.mgrid[0:MASK_RES, 0:MASK_RES] + 0.5
    for poly in me.polygons:
        if poly.material_index:
            continue
        li = list(poly.loop_indices)
        uv = np.array([uvl[i].uv[:] for i in li])
        if np.allclose(uv[0], 0.004):
            continue
        val = np.array([values[me.loops[i].vertex_index] for i in li])
        if val.max() <= 0:
            continue
        px = np.stack([uv[:, 0] * MASK_RES, (1 - uv[:, 1]) * MASK_RES], 1)
        for a, b, c in [(0, k, k + 1) for k in range(1, len(li) - 1)]:
            x_lo, x_hi = int(max(0, min(px[[a, b, c], 0]))), int(min(MASK_RES - 1, max(px[[a, b, c], 0]) + 1))
            y_lo, y_hi = int(max(0, min(px[[a, b, c], 1]))), int(min(MASK_RES - 1, max(px[[a, b, c], 1]) + 1))
            X = xs[y_lo : y_hi + 1, x_lo : x_hi + 1]
            Y = ys[y_lo : y_hi + 1, x_lo : x_hi + 1]
            (x1, y1), (x2, y2), (x3, y3) = px[a], px[b], px[c]
            den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
            if abs(den) < 1e-12:
                continue
            l1 = ((y2 - y3) * (X - x3) + (x3 - x2) * (Y - y3)) / den
            l2 = ((y3 - y1) * (X - x3) + (x1 - x3) * (Y - y3)) / den
            l3 = 1 - l1 - l2
            inside = (l1 >= -0.01) & (l2 >= -0.01) & (l3 >= -0.01)
            v = l1 * val[a] + l2 * val[b] + l3 * val[c]
            region = img[y_lo : y_hi + 1, x_lo : x_hi + 1]
            region[inside] = np.maximum(region[inside], v[inside])
    return img


def blur(img, r=2):
    out = img.copy()
    for _ in range(r):
        out = (
            out
            + np.roll(out, 1, 0)
            + np.roll(out, -1, 0)
            + np.roll(out, 1, 1)
            + np.roll(out, -1, 1)
        ) / 5
    return out


def magnitude(delta, src, lo=0.0, hi=1.0):
    m = np.linalg.norm(delta[src], axis=1)
    m = m / max(m.max(), 1e-9)
    return np.clip((m - lo) / (hi - lo), 0, 1)


def polyline(points, rect, bins=9):
    """Points (Blender space) -> an x-sorted canvas polyline, binned."""
    pts = np.array([to_canvas(p, rect) for p in points])
    pts = pts[np.argsort(pts[:, 0])]
    edges = np.linspace(pts[0, 0], pts[-1, 0] + 1e-9, bins + 1)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        sel = pts[(pts[:, 0] >= a) & (pts[:, 0] < b)]
        if len(sel):
            out.append([round(float(x), 4) for x in sel.mean(0)])
    return out


def face_maps(ob, src):
    """Bakes the makeup masks (R lips, G cheeks) and the landmarks
    the client paints liner, shadow, brows, blush and freckles along. Brows
    follow the upper lid line, so they need no landmark of their own."""
    rect = list(ob["faceRect"])
    lips = magnitude(
        to_blender(
            target("mouth/mouth-upperlip-volume-incr.target")
            + target("mouth/mouth-lowerlip-volume-incr.target"),
            offset=False,
        ),
        src,
        0.12,
        0.55,
    )
    cheeks = magnitude(to_blender(pair("cheek/{s}-cheek-bones-incr.target"), offset=False), src, 0.1, 0.9)
    rgba = np.zeros((MASK_RES, MASK_RES, 4))
    rgba[..., 0] = blur(raster(ob, lips), 1)
    rgba[..., 1] = blur(raster(ob, cheeks), 3)
    rgba[..., 3] = 1
    img = bpy.data.images.new("faceMask", MASK_RES, MASK_RES, alpha=True)
    # Blender images are bottom-up
    img.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    img.filepath_raw = MASK_OUT
    img.file_format = "PNG"
    img.save()
    co = np.array([v.co[:] for v in ob.data.vertices])
    marks = {}
    for eye, side in (("lEye", "l"), ("rEye", "r")):
        up, low = LIDS[eye]
        marks[side + "LidUpper"] = [[round(float(x), 4) for x in to_canvas(p, rect)] for p in up]
        marks[side + "LidLower"] = [[round(float(x), 4) for x in to_canvas(p, rect)] for p in low]
        marks[side + "Eye"] = [round(x, 4) for x in to_canvas(JB[eye], rect)]
        sel = (co[:, 0] > 0) if side == "l" else (co[:, 0] < 0)
        w = cheeks * sel
        marks[side + "Cheek"] = [round(float(x), 4) for x in to_canvas((co * w[:, None]).sum(0) / w.sum(), rect)]
    lip_pts = co[lips > 0.35]
    marks["mouthL"] = [round(x, 4) for x in to_canvas(lip_pts[lip_pts[:, 0].argmax()], rect)]
    marks["mouthR"] = [round(x, 4) for x in to_canvas(lip_pts[lip_pts[:, 0].argmin()], rect)]
    head = W[src, BONES.index("head")] > 0.98
    tip = np.where(head, co[:, 1], 9).argmin()
    marks["noseTip"] = [round(x, 4) for x in to_canvas(co[tip], rect)]
    return marks


def weights(ob, src):
    for b in BONES:
        ob.vertex_groups.new(name=b)
    for vi, mi in enumerate(src):
        for bi, w in enumerate(W[mi]):
            if w > 0.002:
                ob.vertex_groups[bi].add([vi], float(w), "REPLACE")


def shape_keys(ob, src):
    ob.shape_key_add(name="Basis")
    base = np.array([v.co[:] for v in ob.data.vertices])
    for name, d in KB.items():
        k = ob.shape_key_add(name=name, from_mix=False)
        k.slider_min = -1
        k.value = 0
        k.data.foreach_set("co", (base + d[src]).ravel())


def build_eyes():
    """Eyeballs (iris painted on a front planar UV) and glossy corneas.
    One mesh, skinned to lEye/rEye, so both eyes are two draw calls."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.verify()
    for eye in ("lEye", "rEye"):
        c = Vector(JB[eye])
        radius = EYE[eye][1]
        for mat, r, bulge in ((0, radius, 0.0), (1, radius * 1.03, 0.0016)):
            ret = bmesh.ops.create_uvsphere(
                bm, u_segments=28, v_segments=20, radius=r
            )
            vs = ret["verts"]
            # pole to the front (-Y)
            bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
            for v in vs:
                front = max(0.0, -v.co.y / r)
                if bulge and front > 0.85:
                    v.co.y -= bulge * ((front - 0.85) / 0.15) ** 1.5
                v.co += c
            faces = {f for v in vs for f in v.link_faces}
            for f in faces:
                f.material_index = mat
                f.smooth = True
                for loop in f.loops:
                    p = (loop.vert.co - c) / r
                    loop[uv].uv = (0.5 + p.x * 0.5, 0.5 + p.z * 0.5) if p.y < 0 else (0.02, 0.5)
    me = bpy.data.meshes.new("Eyes")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Eyes", me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(material("eye"))
    me.materials.append(material("cornea"))
    gl = ob.vertex_groups.new(name="lEye")
    gr = ob.vertex_groups.new(name="rEye")
    for v in me.vertices:
        (gl if v.co.x > 0 else gr).add([v.index], 1.0, "REPLACE")
    return ob


def build_armature():
    arm = bpy.data.armatures.new("Rig")
    ob = bpy.data.objects.new("Rig", arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    for b in BONES:
        eb = arm.edit_bones.new(b)
        eb.head = Vector(JB[b])
        eb.tail = eb.head + Vector((0, 0, 0.05))
        eb.roll = 0
    for b in BONES:
        if PARENT[b]:
            arm.edit_bones[b].parent = arm.edit_bones[PARENT[b]]
    bpy.ops.object.mode_set(mode="OBJECT")
    return ob


def bind(mesh, rig):
    mesh.parent = rig
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = rig


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def export(rig, objects, name):
    """One GLB per part, each with the shared rig, so the client loads only
    the hair and clothes a doll wears."""
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for ob in objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, name + ".glb"),
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_morph=True,
        export_morph_normal=True,
        export_skins=True,
        export_extras=True,
        export_animations=False,
        export_materials="EXPORT",
        # hair carries root-to-tip shading as vertex colours
        export_vertex_color="ACTIVE",
    )


def piercing_anchors(body):
    """Where piercings sit, in Blender space (Z up), on the base shape: the
    middle of the lower lip, the left nostril, the outer end of the left
    brow, and the navel. Each also carries its outward normal."""
    co = np.array([v.co[:] for v in body.data.vertices])
    nrm = np.array([v.normal[:] for v in body.data.vertices])
    src = BODY_SRC
    lips = np.abs(KB["lips"][src]).sum(1)
    lip_pts = np.where(lips > lips.max() * 0.25)[0]
    centre = lip_pts[np.abs(co[lip_pts, 0]) < 0.006]
    lower = centre[co[centre, 2] < co[lip_pts, 2].mean()]
    lip = lower[co[lower, 1].argmin()]
    nose_d = np.abs(to_blender(target("nose/nose-volume-decr.target"), offset=False)[src]).sum(1)
    nose_pts = np.where(nose_d > nose_d.max() * 0.3)[0]
    # the nostril wing: beside and a little behind and below the tip, on
    # the skin nearest that point
    tip = co[nose_pts[co[nose_pts, 1].argmin()]]
    nostril = np.linalg.norm(co - (tip + np.array([0.014, 0.012, -0.006])), axis=1).argmin()
    upper = LIDS["lEye"][0]
    outer = upper[np.argmax(np.abs(upper[:, 0]))]
    brow_p = outer + np.array([0.004, -0.006, 0.016])
    brow = np.linalg.norm(co - brow_p, axis=1).argmin()
    navel_d = np.abs(to_blender(target("stomach/stomach-navel-in.target"), offset=False)[src]).sum(1)
    navel = navel_d.argmax()

    def at(i):
        return {
            "p": [round(float(x), 4) for x in co[i]],
            "n": [round(float(x), 3) for x in nrm[i]],
        }

    return {"lip": at(lip), "nose": at(nostril), "brow": at(brow), "navel": at(navel)}


def main():
    reset()
    rig = build_armature()
    body = build_body()
    smooth(body)
    eyes = build_eyes()
    bind(body, rig)
    bind(eyes, rig)
    meta = {
        "faceRect": list(body["faceRect"]),
        "eyeRadius": EYE["lEye"][1],
        "marks": MARKS,
        "joints": {b: list(map(float, JB[b])) for b in BONES},
        "anchors": piercing_anchors(body),
    }
    ctx = SimpleNamespace(
        P=P, PB=PB, W=W, BONES=BONES, KEYS=KEYS, FACES=FACES, JB=JB,
        to_blender=to_blender, new_object=new_object,
    )
    parts = doll_hair.build(ctx) + doll_outfits.build(ctx, body, BODY_SRC)
    for ob in parts:
        bind(ob, rig)
        # build-time bookkeeping; glTF would ship it as (large) node extras
        for key in ("deleted", "src", "layer_shade"):
            if key in ob:
                del ob[key]
    # on the body, not the rig: optimisers flatten the rig node away
    body["doll"] = json.dumps(meta)
    os.makedirs(OUT_DIR, exist_ok=True)
    export(rig, [body, eyes], "body")
    # far LOD: MakeHuman's CC0 1.6k-vertex proxy, painted with the same face
    lo = proxies.build(ctx, "Lod_body", "proxymeshes/female1605/female1605.proxy", material("skin"))
    heads = np.zeros(len(lo.data.vertices))
    hi = lo.vertex_groups["head"].index
    for v in lo.data.vertices:
        for g in v.groups:
            if g.group == hi:
                heads[v.index] = g.weight
    face_uvs(lo, None, heads)
    # same tuck keys, in the same order as the full body's
    no_src = np.full(len(lo.data.vertices), -1)
    for part in parts:
        if part.name.startswith(("Outfit", "Swim", "Shoes")):
            doll_outfits.tuck(ctx, lo, no_src, part, part.name.split("_", 1)[1])
    bind(lo, rig)
    for key in ("deleted", "src"):
        if key in lo:
            del lo[key]
    export(rig, [lo], "body-lo")
    for ob in parts:
        kind, name = ob.name.split("_", 1)
        export(rig, [ob], f"{kind.lower()}-{name}")
    print("wrote", OUT_DIR, "body verts", len(body.data.vertices))


main()
