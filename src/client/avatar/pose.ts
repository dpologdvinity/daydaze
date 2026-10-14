import type * as THREE from "three";
import type { Mood } from "../../game/look.ts";

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

export function pose(
  j: Rig,
  mood: Mood | "walk",
  t: number,
  ph: number,
  calm: boolean,
) {
  const breath = Math.sin(t * 1.7);
  const body = j.body;
  if (!body) return;
  body.position.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  r(j.pony, Math.sin(t * 1.6) * 0.05, 0, Math.sin(t * 1.1) * 0.06);

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
  if (mood === "dance") {
    // Reduced motion keeps the sway and arms but drops the bounce.
    const b = calm ? 0 : Math.abs(Math.sin(t * 4.2));
    const sway = Math.sin(t * 2.1);
    body.position.y = -b * 0.045;
    body.position.x = sway * 0.03;
    r(body, 0, sway * 0.3, sway * 0.09);
    r(j.lLeg, -b * 0.3, 0, 0.06);
    r(j.rLeg, -b * 0.3 + 0.1, 0, -0.06);
    r(j.lShin, b * 0.55);
    r(j.rShin, b * 0.45);
    r(j.lFoot, -0.1);
    r(j.rFoot, -0.1);
    r(j.lArm, -0.4, 0, 2.5 + Math.sin(t * 4.2) * 0.25);
    r(j.rArm, -0.4, 0, -2.4 - Math.sin(t * 4.2 + 1) * 0.25);
    r(j.lFore, -0.5, 0, 0.5 + Math.sin(t * 8.4) * 0.3);
    r(j.rFore, -0.5, 0, -0.5);
    r(j.head, 0.05 + b * 0.08, sway * -0.25, sway * 0.12);
    r(j.pony, 0.2 + b * 0.25, 0, sway * 0.3);
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
