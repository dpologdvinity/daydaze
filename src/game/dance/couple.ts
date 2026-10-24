// Partner dancing: where two dolls stand to dance as a couple, and the follow's
// pose as a mirror of the lead's, half a loop behind. Pure; works for any pair
// of dolls, NPC or player.

import {
  poseAt,
  type DanceMove,
  type Joint,
  type Pose,
  type Vec3,
} from "./moves.ts";

/**
 * Which half of a dancing pair a doll is. The lead dances the move as written;
 * the follow mirrors it.
 */
export type CoupleRole = "lead" | "follow";
/** Where one partner stands and which way they face. */
export type CoupleSpot = {
  role: CoupleRole;
  /** Ground position, in the same units as the center. */
  at: [number, number];
  /** Rotation about Y. The two spots face each other. */
  yaw: number;
};

/**
 * Two spots facing each other, `gap` meters apart, centered on `center` and
 * turned by `facing`. Works for any two dolls, NPC or player.
 */
export function coupleSpots(
  center: [number, number],
  facing: number,
  gap: number,
): [CoupleSpot, CoupleSpot] {
  // the lead stands on the left of the facing direction, the follow on the right
  const sin = Math.sin(facing);
  const cos = Math.cos(facing);
  const half = gap / 2;
  const at = (side: number): [number, number] => [
    center[0] + side * half * cos,
    center[1] - side * half * sin,
  ];
  return [
    { role: "lead", at: at(-1), yaw: facing + Math.PI / 2 },
    { role: "follow", at: at(1), yaw: facing - Math.PI / 2 },
  ];
}

const SWAPS: readonly (readonly [Joint, Joint])[] = [
  ["lArm", "rArm"],
  ["lFore", "rFore"],
  ["lLeg", "rLeg"],
  ["lShin", "rShin"],
  ["lFoot", "rFoot"],
];

/**
 * The partner's pose: the follow is half a loop behind the lead and mirrors
 * the arms, so their inside hands meet in the middle.
 */
export function couplePoseAt(
  move: DanceMove,
  role: CoupleRole,
  t: number,
  out: Pose,
): Pose {
  if (role === "lead") return poseAt(move, t, out);
  poseAt(move, t + move.period / 2, out);
  for (const [a, b] of SWAPS) {
    const left = out.joints[a];
    out.joints[a] = out.joints[b];
    out.joints[b] = left;
  }
  // the follow leans the other way, so the pair reads as a mirror
  negateYZ(out.root);
  negateYZ(out.joints.body);
  negateYZ(out.joints.head);
  return out;
}

function negateYZ(v: Vec3) {
  v[1] = -v[1];
  v[2] = -v[2];
}
