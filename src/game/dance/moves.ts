// Dance moves are data: looped clips of joint angles on the doll rig. The
// sampler eases between keys and wraps at the end, so a move loops forever.
// Angles are radians in the rig's own axes (see src/client/avatar/pose.ts).

export const JOINTS = [
  "body",
  "head",
  "pony",
  "lArm",
  "lFore",
  "rArm",
  "rFore",
  "lLeg",
  "lShin",
  "rLeg",
  "rShin",
  "lFoot",
  "rFoot",
] as const;

export type Joint = (typeof JOINTS)[number];
export type Vec3 = [number, number, number];

export type Pose = {
  /** Body offset in metres, added to the doll's root. */
  root: Vec3;
  joints: Record<Joint, Vec3>;
};

type Key = {
  /** Seconds from the start of the clip; the first key sits at 0. */
  at: number;
  root?: Vec3;
  /** Joints left out hold their rest angle, so keys only list what moves. */
  joints?: Partial<Record<Joint, Vec3>>;
};

export type DanceMove = {
  id: DanceMoveId;
  label: string;
  /** Loop length in seconds. */
  period: number;
  keys: readonly Key[];
};

export const DANCE_MOVE_IDS = [
  "two-step",
  "body-roll",
  "hair-flip",
  "y2k-shuffle",
  "voguing",
  "twerk",
  "slow-dance",
] as const;

export type DanceMoveId = (typeof DANCE_MOVE_IDS)[number];

const ZERO: Vec3 = [0, 0, 0];

export function createPose(): Pose {
  const joints = {} as Record<Joint, Vec3>;
  for (const j of JOINTS) joints[j] = [0, 0, 0];
  return { root: [0, 0, 0], joints };
}

// Each move is a short loop. Arm and leg values follow pose.ts: a positive z
// on an arm lifts it outward, a negative x on a leg bends it at the hip.
export const DANCE_MOVES: readonly DanceMove[] = [
  {
    id: "two-step",
    label: "Two-step",
    period: 1,
    keys: [
      {
        at: 0,
        root: [0, -0.045, 0],
        joints: {
          body: [0, 0.25, 0.08],
          lLeg: [-0.25, 0, 0.06],
          rLeg: [0.1, 0, -0.06],
          lShin: [0.5, 0, 0],
          rShin: [0.4, 0, 0],
          lArm: [-0.4, 0, 2.3],
          rArm: [-0.4, 0, -2.3],
          lFore: [-0.5, 0, 0.5],
          rFore: [-0.5, 0, -0.5],
          head: [0.05, -0.2, 0.1],
        },
      },
      { at: 0.25, joints: { lArm: [-0.2, 0, 1.2], rArm: [-0.2, 0, -1.2] } },
      {
        at: 0.5,
        root: [0, -0.045, 0],
        joints: {
          body: [0, -0.25, -0.08],
          lLeg: [0.1, 0, 0.06],
          rLeg: [-0.25, 0, -0.06],
          lShin: [0.4, 0, 0],
          rShin: [0.5, 0, 0],
          lArm: [-0.4, 0, 2.3],
          rArm: [-0.4, 0, -2.3],
          lFore: [-0.5, 0, 0.5],
          rFore: [-0.5, 0, -0.5],
          head: [0.05, 0.2, -0.1],
        },
      },
      { at: 0.75, joints: { lArm: [-0.2, 0, 1.2], rArm: [-0.2, 0, -1.2] } },
    ],
  },
  {
    id: "body-roll",
    label: "Body roll",
    period: 2.4,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.1, 0, 0.3],
          lArm: [-1.8, 0, 2.2],
          rArm: [-0.2, 0, -0.9],
          head: [-0.1, 0, 0],
        },
      },
      {
        at: 0.8,
        joints: {
          body: [0.25, 0, 0],
          lArm: [-0.4, 0, 1.2],
          rArm: [-1.8, 0, -2.2],
        },
      },
      {
        at: 1.6,
        joints: {
          body: [0.1, 0, -0.3],
          lArm: [-0.2, 0, 0.9],
          rArm: [-1.8, 0, -2.2],
          head: [-0.1, 0, 0],
        },
      },
    ],
  },
  {
    id: "hair-flip",
    label: "Hair flip",
    period: 1.2,
    keys: [
      {
        at: 0,
        joints: {
          head: [0.9, 0, 0],
          pony: [1.2, 0, 0],
          lArm: [-0.3, 0, 1.2],
          rArm: [-0.3, 0, -1.2],
        },
      },
      {
        at: 0.45,
        joints: {
          head: [-0.25, 0, 0],
          pony: [-0.5, 0, 0],
          lArm: [-0.3, 0, 1.2],
          rArm: [-0.3, 0, -1.2],
        },
      },
      { at: 0.7, joints: { lArm: [-0.8, 0, 2.6], rArm: [-0.8, 0, -2.6] } },
    ],
  },
  {
    id: "y2k-shuffle",
    label: "Y2K shuffle",
    period: 0.8,
    keys: [
      {
        at: 0,
        root: [0, -0.02, 0],
        joints: {
          lFoot: [0.5, 0, 0],
          rFoot: [-0.2, 0, 0],
          lLeg: [-0.1, 0, 0.12],
          lArm: [-0.3, 0, 1.4],
          rArm: [-0.3, 0, -0.4],
          lFore: [-1.2, 0, 0],
          rFore: [-1.2, 0, 0],
        },
      },
      {
        at: 0.4,
        root: [0, -0.02, 0],
        joints: {
          lFoot: [-0.2, 0, 0],
          rFoot: [0.5, 0, 0],
          rLeg: [-0.1, 0, -0.12],
          lArm: [-0.3, 0, 0.4],
          rArm: [-0.3, 0, -1.4],
          lFore: [-1.2, 0, 0],
          rFore: [-1.2, 0, 0],
        },
      },
    ],
  },
  {
    id: "voguing",
    label: "Voguing",
    period: 1.6,
    keys: [
      {
        at: 0,
        joints: {
          head: [0, 0.6, 0],
          body: [0, 0.3, 0],
          lArm: [-1.5, 0, 0.3],
          rArm: [-0.2, 0, -0.4],
          lFore: [0, 0, 1.6],
          rFore: [-1.4, 0, 0],
        },
      },
      {
        at: 0.4,
        joints: {
          head: [-0.1, -0.5, 0],
          body: [0, -0.3, 0],
          lArm: [-0.2, 0, 2.6],
          rArm: [-1.5, 0, -0.3],
          lFore: [-1.4, 0, 0],
          rFore: [0, 0, -1.6],
        },
      },
      {
        at: 0.8,
        joints: {
          head: [0.1, 0, 0.2],
          body: [0.05, 0, 0],
          lArm: [-1.1, 0, 1.6],
          rArm: [-1.1, 0, -1.6],
          lFore: [0, 0, 0.8],
          rFore: [0, 0, -0.8],
        },
      },
    ],
  },
  {
    id: "twerk",
    label: "Twerk",
    period: 0.9,
    keys: [
      {
        at: 0,
        root: [0, -0.05, 0],
        joints: {
          body: [0.45, 0, 0],
          lLeg: [-0.6, 0, 0.1],
          rLeg: [-0.6, 0, -0.1],
          lShin: [0.9, 0, 0],
          rShin: [0.9, 0, 0],
          lArm: [-0.5, 0, 0.5],
          rArm: [-0.5, 0, -0.5],
          lFore: [-1.2, 0, 0],
          rFore: [-1.2, 0, 0],
          head: [-0.3, 0, 0],
        },
      },
      { at: 0.45, root: [0, 0, 0], joints: { body: [0.1, 0, 0] } },
    ],
  },
  {
    id: "slow-dance",
    label: "Slow dance",
    period: 4,
    keys: [
      {
        at: 0,
        root: [0, 0, 0.02],
        joints: {
          body: [0, 0.12, 0.05],
          head: [0.05, 0.15, 0.08],
          lArm: [-0.7, 0, 0.5],
          rArm: [-0.7, 0, -0.5],
          lFore: [-0.9, 0, 0.2],
          rFore: [-0.9, 0, -0.2],
        },
      },
      {
        at: 2,
        root: [0, 0, -0.02],
        joints: {
          body: [0, -0.12, -0.05],
          head: [0.05, -0.15, -0.08],
          lArm: [-0.7, 0, 0.5],
          rArm: [-0.7, 0, -0.5],
          lFore: [-0.9, 0, 0.2],
          rFore: [-0.9, 0, -0.2],
        },
      },
    ],
  },
];

const BY_ID = new Map<string, DanceMove>(DANCE_MOVES.map((m) => [m.id, m]));

export function danceMove(id: DanceMoveId): DanceMove {
  const move = BY_ID.get(id);
  if (!move) throw new Error(`unknown dance move: ${id}`);
  return move;
}

export function isDanceMoveId(value: unknown): value is DanceMoveId {
  return typeof value === "string" && BY_ID.has(value);
}

const smooth = (u: number) => u * u * (3 - 2 * u);

function lerp3(out: Vec3, a: Vec3, b: Vec3, e: number) {
  out[0] = a[0] + (b[0] - a[0]) * e;
  out[1] = a[1] + (b[1] - a[1]) * e;
  out[2] = a[2] + (b[2] - a[2]) * e;
}

/**
 * Samples a move at time `t` (seconds, any value, looped) into `out`.
 * Writes in place so a doll can reuse one pose per frame without allocating.
 */
export function poseAt(move: DanceMove, t: number, out = createPose()): Pose {
  const { keys, period } = move;
  const local = ((t % period) + period) % period;
  // the segment from the last key at or before `local` to the next one (or
  // back to the first key, one period later, when the loop wraps)
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].at <= local) i += 1;
  const a = keys[i];
  const next = keys[i + 1];
  const b = next ?? keys[0];
  const bAt = next ? next.at : keys[0].at + period;
  const span = bAt - a.at;
  const u = span > 0 ? (local - a.at) / span : 0;
  const e = smooth(Math.min(1, Math.max(0, u)));
  lerp3(out.root, a.root ?? ZERO, b.root ?? ZERO, e);
  for (const j of JOINTS) {
    lerp3(out.joints[j], a.joints?.[j] ?? ZERO, b.joints?.[j] ?? ZERO, e);
  }
  return out;
}
