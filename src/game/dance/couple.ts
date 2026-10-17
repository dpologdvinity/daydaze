import {
  poseAt,
  type DanceMove,
  type Joint,
  type Pose,
  type Vec3,
} from "./moves.ts";

export type CoupleRole = "lead" | "follow";
export type CoupleSpot = {
  role: CoupleRole;
  /** Ground position, in the same units as the centre. */
  at: [number, number];
  /** Rotation about Y. The two spots face each other. */
  yaw: number;
};

/**
 * Two spots facing each other, `gap` metres apart, centred on `centre` and
 * turned by `facing`. Works for any two dolls, NPC or player.
 */
export function coupleSpots(
  centre: [number, number],
  facing: number,
  gap: number,
): [CoupleSpot, CoupleSpot] {
  // the lead stands on the left of the facing direction, the follow on the right
  const sin = Math.sin(facing);
  const cos = Math.cos(facing);
  const half = gap / 2;
  const at = (side: number): [number, number] => [
    centre[0] + side * half * cos,
    centre[1] - side * half * sin,
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
