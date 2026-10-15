import type * as THREE from "three";
import type { Mood } from "../../game/look.ts";
import { JOINTS, type Pose } from "../../game/dance/moves.ts";

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
) {
  poseMood(j, mood, t, ph, calm, dance);
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
    return;
  }

  if (mood === "walk") {
    const s = Math.sin(ph),
      c = Math.cos(ph);
    body.position.y = Math.abs(c) * 0.025 - 0.012;
    r(body, 0.04, s * 0.12, s * 0.04);
    r(j.lLeg, -s * 0.5, 0, 0.02);
    r(j.rLeg, s * 0.5, 0, -0.02);
    r(j.lShin, 0.15 + Math.max(0, c) * 0.75);
    r(j.rShin, 0.15 + Math.max(0, -c) * 0.75);
    r(j.lFoot, s * 0.2 - 0.1);
    r(j.rFoot, -s * 0.2 - 0.1);
    r(j.lArm, s * 0.45, 0, 0.13);
    r(j.rArm, -s * 0.45, 0, -0.13);
    r(j.lFore, -0.35);
    r(j.rFore, -0.35);
    r(j.head, -0.02, -s * 0.08, 0);
    r(j.pony, 0.15 + c * 0.12, 0, s * 0.15);
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
  r(j.lArm, 0.04 + breath * 0.01, 0, 0.16);
  r(j.rArm, 0.04 + breath * 0.01, 0, -0.16);
  r(j.lFore, -0.2, 0, 0.05);
  r(j.rFore, -0.2, 0, -0.05);
  r(j.head, Math.sin(t * 0.4) * 0.04, Math.sin(t * 0.27) * 0.18, shift * 0.06);
}
