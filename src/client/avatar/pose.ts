import type * as THREE from "three";
import type { Mood } from "../../game/look.ts";
import { JOINTS, type Pose } from "../../game/dance/moves.ts";
import { GAITS, type Gait } from "../../game/gaits.ts";

type JointName =
  | "body"
  | "head"
  | "lArm"
  | "lFore"
  | "rArm"
  | "rFore"
  | "lLeg"
  | "lShin"
  | "rLeg"
  | "rShin"
  | "lFoot"
  | "rFoot"
  | "pony";

type Joint = THREE.Group | null | undefined;
export type Rig = Partial<Record<JointName, THREE.Group | null>>;

function r(j: Joint, x = 0, y = 0, z = 0) {
  j?.rotation.set(x, y, z);
}

/**
 * Poses the rig. A dance move's sampled `dance` pose wins over the mood's
 * own dance; `wobble` (0..1, from the buzz) tips the body on top of any mood.
 */
export function pose(
  j: Rig,
  mood: Mood | "walk",
  t: number,
  ph: number,
  calm: boolean,
  dance: Pose | null = null,
  wobble = 0,
  gait: Gait = GAITS[0],
) {
  poseMood(j, mood, t, ph, calm, dance, gait);
  const body = j.body;
  if (!body || wobble <= 0) return;
  body.rotation.z += wobble * 0.08 * Math.sin(t * 1.3);
  body.rotation.x += wobble * 0.05 * Math.sin(t * 0.9 + 1);
  body.position.x += wobble * 0.02 * Math.sin(t * 1.1);
}

function poseMood(
  j: Rig,
  mood: Mood | "walk",
  t: number,
  ph: number,
  calm: boolean,
  dance: Pose | null,
  gait: Gait,
) {
  const breath = Math.sin(t * 1.7);
  const body = j.body;
  if (!body) return;
  body.position.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  r(j.pony, Math.sin(t * 1.6) * 0.05, 0, Math.sin(t * 1.1) * 0.06);
  if (mood === "dance" && dance) {
    // a move drives every joint; reduced motion keeps its sway but not its bounce
    body.position.set(dance.root[0], calm ? 0 : dance.root[1], dance.root[2]);
    for (const name of JOINTS) r(j[name], ...dance.joints[name]);
    // the 3D doll's arms rest angled out; draw them in like the other poses
    if (j.lArm) j.lArm.rotation.z -= ARM_IN;
    if (j.rArm) j.rArm.rotation.z += ARM_IN;
    if (calm) return;
    // a groove under every move: a soft knee dip on each beat (120 bpm), with
    // the head nodding into it, so the whole body moves to the music
    const dip = 0.5 - 0.5 * Math.cos(t * Math.PI * 4);
    body.position.y -= dip * 0.018;
    for (const leg of [j.lLeg, j.rLeg]) if (leg) leg.rotation.x -= dip * 0.07;
    for (const shin of [j.lShin, j.rShin])
      if (shin) shin.rotation.x += dip * 0.14;
    if (j.head) j.head.rotation.x += dip * 0.04;
    return;
  }

  if (mood === "walk") {
    walk(j, ph, gait);
    return;
  }
  if (mood === "sit") {
    body.position.y = -0.33;
    r(body, -0.08, 0, 0);
    r(j.lLeg, -1.45, 0, 0.12);
    r(j.rLeg, -1.55, 0, -0.18);
    r(j.lShin, 1.35, 0, 0);
    r(j.rShin, 1.5, 0, 0);
    r(j.lFoot, 0.25);
    r(j.rFoot, 0.25);
    r(j.lArm, -0.35, 0, 0.12);
    r(j.rArm, -0.2, 0, -0.5);
    r(j.lFore, -0.9, 0, -0.2);
    r(j.rFore, -1.3, 0, 0.3);
    r(j.head, 0.05 + breath * 0.01, 0.3 + Math.sin(t * 0.4) * 0.15, 0.1);
    return;
  }
  const shift = Math.sin(t * 0.55);
  body.scale.set(1, 1 + breath * 0.004, 1 + breath * 0.008);
  if (mood === "pose" || mood === "lean") {
    // hip pop, hand on hip, crossed step
    body.position.x = 0.025;
    r(body, 0, 0.12, 0.06 + shift * 0.01);
    r(j.lLeg, -0.18, 0.1, -0.1);
    r(j.lShin, 0.32);
    r(j.lFoot, -0.15);
    r(j.rLeg, 0.04, 0, -0.04);
    r(j.rShin, 0.02);
    r(j.rFoot, 0);
    r(j.rArm, 0.15, 0, -0.78);
    r(j.rFore, -0.2, 0, 1.95);
    if (mood === "lean") {
      r(j.lArm, -0.35, 0, 0.18);
      r(j.lFore, -1.75 + breath * 0.03, 0, -0.2);
    } else {
      r(j.lArm, 0.05, 0, 0.2);
      r(j.lFore, -0.25, 0, 0.15);
    }
    r(j.head, 0.06, -0.12 + Math.sin(t * 0.3) * 0.06, -0.14);
    return;
  }
  // idle: weight shift, relaxed arms, slow look-around
  body.position.x = shift * 0.012;
  r(body, 0, 0, shift * 0.025);
  r(j.lLeg, 0, 0, 0.02 + shift * 0.02);
  r(j.rLeg, -0.06, 0, -0.03);
  r(j.lShin, 0.02);
  r(j.rShin, 0.12 + Math.max(0, -shift) * 0.08);
  r(j.lFoot, 0);
  r(j.rFoot, -0.06);
  // the model's arms rest a little out from the hips; draw them in to hang
  r(j.lArm, 0.04 + breath * 0.01, 0, -ARM_IN);
  r(j.rArm, 0.04 + breath * 0.01, 0, ARM_IN);
  r(j.lFore, -0.2, 0, 0.05);
  r(j.rFore, -0.2, 0, -0.05);
  r(j.head, Math.sin(t * 0.4) * 0.04, Math.sin(t * 0.27) * 0.18, shift * 0.06);
}

// the 3D doll's arms rest angled out to clear her hips; this much inward
// brings them to hang naturally at her sides
const ARM_IN = 0.14;

/**
 * One stride. `ph` advances a full turn every two steps. The body bone is
 * hips and chest at once, so its sway stays small and the head and arms
 * counter it, keeping the shoulders and gaze level as a real walker does.
 */
function walk(j: Rig, ph: number, g: Gait) {
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const body = j.body;
  if (!body) return;
  // lowest when the legs are spread, highest as one passes the other
  body.position.y = g.bounce * (Math.abs(c) - 0.6);
  body.position.x = s * g.hipSway * 0.18;
  const tilt = s * g.hipSway * 0.45;
  const turn = s * g.twist;
  r(body, 0.02, turn, tilt);
  // legs swing opposite, stepping in toward the midline (all the way on a runway)
  const inward = 0.04 + g.cross * 0.07;
  r(j.lLeg, -s * g.stride, 0, -inward + tilt);
  r(j.rLeg, s * g.stride, 0, inward + tilt);
  // the knee folds as the leg swings through, and straightens to land
  r(j.lShin, 0.06 + Math.max(0, c) * g.knee);
  r(j.rShin, 0.06 + Math.max(0, -c) * g.knee);
  // heel strike in front, toe-off behind
  r(j.lFoot, s * 0.22 - 0.04);
  r(j.rFoot, -s * 0.22 - 0.04);
  // arms swing against the legs, close to the body, elbows softly bent
  r(j.lArm, s * g.armSwing, 0, -ARM_IN - tilt);
  r(j.rArm, -s * g.armSwing, 0, ARM_IN - tilt);
  r(j.lFore, -g.elbow - Math.max(0, s) * g.armSwing * 0.6, 0, 0);
  r(j.rFore, -g.elbow - Math.max(0, -s) * g.armSwing * 0.6, 0, 0);
  // gaze level: the head undoes the body's tilt and twist
  r(j.head, -g.chin, -turn * 0.8, -tilt);
  r(j.pony, 0.12 + c * 0.08, 0, s * 0.12);
}
