import { MOCAP_CLIPS, MOCAP_DANCE_IDS, MOCAP_EMOTE_IDS } from "./mocap.ts";
import type { MocapClip, MocapKey } from "./mocapTypes.ts";
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
  /** Body offset in meters, added to the doll's root. */
  root: Vec3;
  joints: Record<Joint, Vec3>;
  /** Set for motion capture: already exact for the 3D doll, no extra groove. */
  captured: boolean;
  /** False for game clips: the doll holds the shape, no knee dip on the beat. */
  groove: boolean;
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
  /** Motion capture, retargeted (see mocap.ts). */
  captured?: boolean;
  /** Loop length in seconds. */
  period: number;
  keys: readonly Key[];
  /** Game clips set this false: no beat dip under a dive or an aim. */
  groove?: false;
};

export const DANCE_MOVE_IDS = [
  "groove",
  "hip-sway",
  "shimmy",
  "two-step",
  "body-roll",
  "hair-flip",
  "y2k-shuffle",
  "voguing",
  "twerk",
  "slow-dance",
  // poses for two (see together.ts), kept out of the solo picker
  "hug",
  "hold-hands",
  "forehead-kiss",
  // game clips the player's doll plays in in-world games (see GAME_CLIP_IDS)
  "tuck",
  "dive-pencil",
  "dive-swan",
  "dive-backflip",
  "dive-twist",
  "stir",
  "chop",
  "aim-pistol",
  "aim-rifle",
  // motion capture (see mocap.ts)
  ...MOCAP_DANCE_IDS,
  ...MOCAP_EMOTE_IDS,
] as const;

export type DanceMoveId = (typeof DANCE_MOVE_IDS)[number];

const ZERO: Vec3 = [0, 0, 0];

export function createPose(): Pose {
  const joints = {} as Record<Joint, Vec3>;
  for (const j of JOINTS) joints[j] = [0, 0, 0];
  return { root: [0, 0, 0], joints, captured: false, groove: true };
}

// Each move is a short loop. Arm and leg values follow pose.ts: a positive z
// on an arm lifts it outward, a negative x on a leg bends it at the hip.
export const DANCE_MOVES: readonly DanceMove[] = [
  {
    // the club default: weight from foot to foot on the beat, hips rolling
    // with it, arms loose at the sides and lifting a little on the off-beat
    id: "groove",
    label: "Groove",
    period: 2,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.02, 0.12, 0.07],
          lLeg: [-0.08, 0, 0.03],
          rLeg: [0.04, 0, -0.06],
          lShin: [0.18, 0, 0],
          rShin: [0.02, 0, 0],
          lArm: [-0.25, 0, 0.05],
          rArm: [0.1, 0, -0.05],
          lFore: [-1.0, 0, 0.2],
          rFore: [-0.6, 0, -0.1],
          head: [0.04, -0.1, -0.06],
        },
      },
      {
        at: 0.5,
        joints: {
          body: [0.03, 0, 0],
          lArm: [-0.45, 0, 0.25],
          rArm: [-0.15, 0, -0.1],
          lFore: [-1.3, 0, 0.3],
          rFore: [-0.9, 0, -0.2],
          head: [-0.04, 0, 0],
        },
      },
      {
        at: 1,
        joints: {
          body: [0.02, -0.12, -0.07],
          lLeg: [0.04, 0, 0.06],
          rLeg: [-0.08, 0, -0.03],
          lShin: [0.02, 0, 0],
          rShin: [0.18, 0, 0],
          lArm: [0.1, 0, 0.05],
          rArm: [-0.25, 0, -0.05],
          lFore: [-0.6, 0, 0.1],
          rFore: [-1.0, 0, -0.2],
          head: [0.04, 0.1, 0.06],
        },
      },
      {
        at: 1.5,
        joints: {
          body: [0.03, 0, 0],
          lArm: [-0.15, 0, 0.1],
          rArm: [-0.45, 0, -0.25],
          lFore: [-0.9, 0, 0.2],
          rFore: [-1.3, 0, -0.3],
          head: [-0.04, 0, 0],
        },
      },
    ],
  },
  {
    // a slow figure-eight with the hips, hands drifting over them
    id: "hip-sway",
    label: "Hip sway",
    period: 2.4,
    keys: [
      {
        at: 0,
        root: [0.03, 0, 0],
        joints: {
          body: [0, 0.18, -0.1],
          lLeg: [0, 0, 0.08],
          rLeg: [-0.12, 0, -0.02],
          rShin: [0.25, 0, 0],
          lArm: [-0.3, 0, 0.1],
          rArm: [-0.2, 0, -0.15],
          lFore: [-1.1, 0, 0.6],
          rFore: [-0.5, 0, -0.2],
          head: [0.08, -0.15, 0.1],
        },
      },
      {
        at: 0.6,
        root: [0, -0.015, 0],
        joints: { body: [0.06, 0, 0], head: [0.1, 0, 0] },
      },
      {
        at: 1.2,
        root: [-0.03, 0, 0],
        joints: {
          body: [0, -0.18, 0.1],
          lLeg: [-0.12, 0, 0.02],
          rLeg: [0, 0, -0.08],
          lShin: [0.25, 0, 0],
          lArm: [-0.2, 0, 0.15],
          rArm: [-0.3, 0, -0.1],
          lFore: [-0.5, 0, 0.2],
          rFore: [-1.1, 0, -0.6],
          head: [0.08, 0.15, -0.1],
        },
      },
      {
        at: 1.8,
        root: [0, -0.015, 0],
        joints: { body: [0.06, 0, 0], head: [0.1, 0, 0] },
      },
    ],
  },
  {
    // shoulders shimmy fast while the hips keep a slow sway
    id: "shimmy",
    label: "Shimmy",
    period: 1,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.08, 0.15, 0.04],
          lArm: [-0.55, 0, 0.12],
          rArm: [-0.55, 0, -0.12],
          lFore: [-1.4, 0, 0],
          rFore: [-1.4, 0, 0],
          lShin: [0.2, 0, 0],
          rShin: [0.2, 0, 0],
          head: [-0.05, -0.1, 0],
        },
      },
      {
        at: 0.25,
        joints: {
          body: [0.08, -0.15, -0.04],
          lArm: [-0.6, 0, 0.2],
          rArm: [-0.6, 0, -0.2],
          lFore: [-1.4, 0, 0],
          rFore: [-1.4, 0, 0],
          lShin: [0.2, 0, 0],
          rShin: [0.2, 0, 0],
          head: [-0.05, 0.1, 0],
        },
      },
      {
        at: 0.5,
        joints: {
          body: [0.08, 0.15, -0.04],
          lArm: [-0.55, 0, 0.12],
          rArm: [-0.55, 0, -0.12],
          lFore: [-1.4, 0, 0],
          rFore: [-1.4, 0, 0],
          lShin: [0.2, 0, 0],
          rShin: [0.2, 0, 0],
          head: [-0.05, -0.1, 0],
        },
      },
      {
        at: 0.75,
        joints: {
          body: [0.08, -0.15, 0.04],
          lArm: [-0.6, 0, 0.2],
          rArm: [-0.6, 0, -0.2],
          lFore: [-1.4, 0, 0],
          rFore: [-1.4, 0, 0],
          lShin: [0.2, 0, 0],
          rShin: [0.2, 0, 0],
          head: [-0.05, 0.1, 0],
        },
      },
    ],
  },
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
          body: [0.06, 0, 0.12],
          lArm: [-1.8, 0, 2.2],
          rArm: [-0.3, 0, -0.25],
          head: [-0.1, 0, 0],
        },
      },
      {
        at: 0.8,
        joints: {
          body: [0.12, 0, 0],
          lArm: [-0.5, 0, 0.5],
          rArm: [-1.8, 0, -2.2],
        },
      },
      {
        at: 1.6,
        joints: {
          body: [0.06, 0, -0.12],
          lArm: [-0.3, 0, 0.25],
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
  {
    // arms wrapped round the partner, cheek turned, a slow rock side to side
    id: "hug",
    label: "Hug",
    period: 3,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.08, 0.04, 0.03],
          head: [0.1, 0.35, 0.08],
          lArm: [-0.95, 0, 0.2],
          rArm: [-0.9, 0, -0.18],
          lFore: [-1.25, 0, 0.5],
          rFore: [-1.2, 0, -0.5],
        },
      },
      {
        at: 1.5,
        joints: {
          body: [0.08, -0.04, -0.03],
          head: [0.1, 0.3, 0.04],
          lArm: [-0.9, 0, 0.18],
          rArm: [-0.95, 0, -0.2],
          lFore: [-1.2, 0, 0.5],
          rFore: [-1.25, 0, -0.5],
        },
      },
    ],
  },
  {
    // side by side: the inside (right) hand reaches down for the partner's,
    // a little sway while you stand together
    id: "hold-hands",
    label: "Hold hands",
    period: 4,
    keys: [
      {
        at: 0,
        joints: {
          body: [0, -0.06, -0.02],
          head: [0, -0.25, -0.04],
          rArm: [-0.2, 0, -0.3],
          rFore: [-0.25, 0, 0],
          lArm: [0.05, 0, 0.05],
          lFore: [-0.15, 0, 0],
        },
      },
      {
        at: 2,
        joints: {
          body: [0, -0.02, 0.02],
          head: [0.03, -0.15, 0],
          rArm: [-0.2, 0, -0.32],
          rFore: [-0.25, 0, 0],
          lArm: [0, 0, 0.05],
          lFore: [-0.2, 0, 0],
        },
      },
    ],
  },
  {
    // hands on the partner's shoulders, leaning in until foreheads touch
    id: "forehead-kiss",
    label: "Forehead kiss",
    period: 4,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.12, 0, 0],
          head: [0.3, 0, 0],
          lArm: [-1.3, 0, 0.15],
          rArm: [-1.3, 0, -0.15],
          lFore: [-0.7, 0, 0.35],
          rFore: [-0.7, 0, -0.35],
        },
      },
      {
        at: 2,
        joints: {
          body: [0.16, 0, 0],
          head: [0.38, 0.05, 0.03],
          lArm: [-1.35, 0, 0.15],
          rArm: [-1.35, 0, -0.15],
          lFore: [-0.75, 0, 0.35],
          rFore: [-0.75, 0, -0.35],
        },
      },
    ],
  },
  // ---- game clips: held shapes for in-world games, no beat dip ----
  {
    // knees hugged to the chest, chin down: the slide's tuck and a dive's ball
    id: "tuck",
    label: "Tuck",
    period: 1,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.45, 0, 0],
          head: [0.35, 0, 0],
          lLeg: [-2.35, 0, 0.08],
          rLeg: [-2.35, 0, -0.08],
          lShin: [2.5, 0, 0],
          rShin: [2.5, 0, 0],
          lArm: [-1.1, 0, 0.1],
          rArm: [-1.1, 0, -0.1],
          lFore: [-1.3, 0, 0],
          rFore: [-1.3, 0, 0],
          lFoot: [0.5, 0, 0],
          rFoot: [0.5, 0, 0],
        },
      },
      {
        at: 0.5,
        joints: {
          body: [0.5, 0, 0],
          head: [0.4, 0, 0],
          lLeg: [-2.4, 0, 0.08],
          rLeg: [-2.4, 0, -0.08],
          lShin: [2.55, 0, 0],
          rShin: [2.55, 0, 0],
          lArm: [-1.15, 0, 0.1],
          rArm: [-1.15, 0, -0.1],
          lFore: [-1.35, 0, 0],
          rFore: [-1.35, 0, 0],
          lFoot: [0.5, 0, 0],
          rFoot: [0.5, 0, 0],
        },
      },
    ],
  },
  {
    // feet first, straight as a pencil, arms pressed to the sides
    id: "dive-pencil",
    label: "Pencil dive",
    period: 1,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          head: [-0.05, 0, 0],
          lArm: [0, 0, -0.12],
          rArm: [0, 0, 0.12],
          lLeg: [0, 0, -0.03],
          rLeg: [0, 0, 0.03],
          lFoot: [0.7, 0, 0],
          rFoot: [0.7, 0, 0],
        },
      },
    ],
  },
  {
    // arms spread like wings, back arched, legs long and toes pointed
    id: "dive-swan",
    label: "Swan dive",
    period: 1,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [-0.22, 0, 0],
          head: [-0.35, 0, 0],
          lArm: [-0.25, 0, 1.45],
          rArm: [-0.25, 0, -1.45],
          lFore: [-0.05, 0, 0],
          rFore: [-0.05, 0, 0],
          lLeg: [0.12, 0, 0],
          rLeg: [0.12, 0, 0],
          lFoot: [0.7, 0, 0],
          rFoot: [0.7, 0, 0],
        },
      },
    ],
  },
  {
    // a backflip's tight ball: shins grabbed, head thrown back into the turn
    id: "dive-backflip",
    label: "Backflip",
    period: 1,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.3, 0, 0],
          head: [-0.3, 0, 0],
          lLeg: [-2.4, 0, 0.12],
          rLeg: [-2.4, 0, -0.12],
          lShin: [2.5, 0, 0],
          rShin: [2.5, 0, 0],
          lArm: [-1.3, 0, 0.2],
          rArm: [-1.3, 0, -0.2],
          lFore: [-0.6, 0, 0],
          rFore: [-0.6, 0, 0],
          lFoot: [0.6, 0, 0],
          rFoot: [0.6, 0, 0],
        },
      },
    ],
  },
  {
    // a twist's spindle: arms straight overhead, the body turning, legs locked
    id: "dive-twist",
    label: "Twist",
    period: 1,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [0, 0.35, 0],
          head: [-0.1, 0.15, 0],
          lArm: [-2.95, 0, -0.1],
          rArm: [-2.95, 0, 0.1],
          lLeg: [0, 0, -0.04],
          rLeg: [0, 0, 0.04],
          lFoot: [0.7, 0, 0],
          rFoot: [0.7, 0, 0],
        },
      },
    ],
  },
  {
    // over the wok: the left hand holds the pan, the right stirs in circles
    id: "stir",
    label: "Stirring",
    period: 1.2,
    groove: false,
    keys: [0, 0.3, 0.6, 0.9].map((at, i) => {
      const a = (i / 4) * Math.PI * 2;
      return {
        at,
        joints: {
          body: [0.18, 0, 0],
          head: [0.4, 0, 0],
          lArm: [-0.55, 0, -0.1],
          lFore: [-1.1, 0, 0],
          rArm: [-0.75 + Math.sin(a) * 0.12, 0, 0.12 + Math.cos(a) * 0.1],
          rFore: [-1.2 + Math.cos(a) * 0.15, 0, 0],
        },
      } satisfies Key;
    }),
  },
  {
    // at the board: the right hand chops, the left steadies the food
    id: "chop",
    label: "Chopping",
    period: 0.5,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.2, 0, 0],
          head: [0.45, 0, 0],
          lArm: [-0.5, 0, -0.15],
          lFore: [-1.35, 0, 0],
          rArm: [-0.85, 0, 0.05],
          rFore: [-1.55, 0, 0],
        },
      },
      {
        at: 0.25,
        joints: {
          body: [0.22, 0, 0],
          head: [0.45, 0, 0],
          lArm: [-0.5, 0, -0.15],
          lFore: [-1.35, 0, 0],
          rArm: [-0.6, 0, 0.05],
          rFore: [-0.85, 0, 0],
        },
      },
    ],
  },
  {
    // a two-handed grip, arms out at eye level, feet in a steady stance
    id: "aim-pistol",
    label: "Aiming",
    period: 2,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          head: [0.04, 0, 0],
          lArm: [-1.5, 0, -0.28],
          rArm: [-1.52, 0, 0.22],
          lFore: [-0.12, 0, 0],
          rFore: [-0.08, 0, 0],
          lLeg: [-0.18, 0, 0.06],
          rLeg: [0.12, 0, -0.06],
          lShin: [0.15, 0, 0],
        },
      },
      {
        at: 1,
        joints: {
          head: [0.05, 0, 0],
          lArm: [-1.48, 0, -0.27],
          rArm: [-1.5, 0, 0.21],
          lFore: [-0.12, 0, 0],
          rFore: [-0.08, 0, 0],
          lLeg: [-0.18, 0, 0.06],
          rLeg: [0.12, 0, -0.06],
          lShin: [0.15, 0, 0],
        },
      },
    ],
  },
  {
    // the stock at the right shoulder, left hand out under the barrel, cheek
    // down on the stock
    id: "aim-rifle",
    label: "Aiming",
    period: 2,
    groove: false,
    keys: [
      {
        at: 0,
        joints: {
          body: [0.04, 0.2, 0],
          head: [0.12, -0.15, 0.18],
          lArm: [-1.35, 0, -0.35],
          lFore: [-0.35, 0, 0],
          rArm: [-0.55, 0, -0.85],
          rFore: [-1.65, 0, 0],
          lLeg: [-0.2, 0, 0.08],
          rLeg: [0.12, 0, -0.08],
          lShin: [0.15, 0, 0],
        },
      },
      {
        at: 1,
        joints: {
          body: [0.04, 0.21, 0],
          head: [0.12, -0.15, 0.18],
          lArm: [-1.33, 0, -0.35],
          lFore: [-0.35, 0, 0],
          rArm: [-0.55, 0, -0.85],
          rFore: [-1.65, 0, 0],
          lLeg: [-0.2, 0, 0.08],
          rLeg: [0.12, 0, -0.08],
          lShin: [0.15, 0, 0],
        },
      },
    ],
  },
];

// motion capture: the clips are listed up front, their keys load with
// loadMocap(). Until then a captured dance holds still and walks use the
// built stride, so nothing waits on the download.
const STILL: readonly Key[] = [{ at: 0 }];

function capturedMove(c: MocapClip, id: DanceMoveId): DanceMove {
  return { id, label: c.label, period: c.period, keys: STILL, captured: true };
}

const CAPTURED: readonly DanceMove[] = MOCAP_CLIPS.flatMap((c) =>
  (c.kind === "dance" || c.kind === "emote") && isMoveId(c.id)
    ? [capturedMove(c, c.id)]
    : [],
);

function isMoveId(id: string): id is DanceMoveId {
  return DANCE_MOVE_IDS.some((m) => m === id);
}

const walkClips = new Map<string, DanceMove>();
const stillClips = new Map<string, DanceMove>();

/** Motion-capture walk loops by clip id, once loaded (see gaits.ts). */
export const WALK_CLIPS: ReadonlyMap<string, DanceMove> = walkClips;

/** Held poses (standing, sitting, lying) by clip id, once loaded. */
export const STILL_CLIPS: ReadonlyMap<string, DanceMove> = stillClips;

/** The player's picked held pose per mood; "built" is the hand-made one. */
export type Holds = Record<"pose" | "sit", string>;
export const DEFAULT_HOLDS: Holds = { pose: "built", sit: "built" };

/** The held-pose clips of one kind, for pickers. */
export function stillClipsOf(kind: "pose" | "sit" | "lay") {
  return MOCAP_CLIPS.filter((c) => c.kind === kind);
}

let loading: Promise<void> | null = null;

/** Fetches the motion-capture keys (a separate chunk) and fills the moves. */
export function loadMocap(): Promise<void> {
  loading ??= import("./mocapKeys.ts").then(({ MOCAP_KEYS }) => {
    const keysOf = (id: string): readonly MocapKey[] => MOCAP_KEYS[id] ?? STILL;
    for (const m of CAPTURED) m.keys = keysOf(m.id);
    for (const c of MOCAP_CLIPS) {
      if (c.kind === "dance" || c.kind === "emote") continue;
      const move = { ...capturedMove(c, "groove"), keys: keysOf(c.id) };
      (c.kind === "walk" ? walkClips : stillClips).set(c.id, move);
    }
  });
  return loading;
}

export const ALL_DANCE_MOVES: readonly DanceMove[] = [
  ...DANCE_MOVES,
  ...CAPTURED,
];

/**
 * Clips the player's doll plays during in-world games (volleyball, diving,
 * karaoke, the cook-off, the target lanes); never in the Dance picker.
 */
export const GAME_CLIP_IDS = [
  "dig",
  "spike",
  "sing",
  "tuck",
  "dive-pencil",
  "dive-swan",
  "dive-backflip",
  "dive-twist",
  "stir",
  "chop",
  "aim-pistol",
  "aim-rifle",
] as const satisfies readonly DanceMoveId[];

/** One of the game clips. */
export type GameClipId = (typeof GAME_CLIP_IDS)[number];

const EMOTES: ReadonlySet<string> = new Set([
  ...MOCAP_EMOTE_IDS,
  ...GAME_CLIP_IDS,
  "hug",
  "hold-hands",
  "forehead-kiss",
]);

/** The moves the player picks from: every dance, no NPC emotes or poses for two. */
export const PICKER_DANCE_MOVES: readonly DanceMove[] = ALL_DANCE_MOVES.filter(
  (m) => !EMOTES.has(m.id),
);

const BY_ID = new Map<string, DanceMove>(ALL_DANCE_MOVES.map((m) => [m.id, m]));

export function danceMove(id: DanceMoveId): DanceMove {
  const move = BY_ID.get(id);
  if (!move) throw new Error(`unknown dance move: ${id}`);
  return move;
}

export function isDanceMoveId(value: unknown): value is DanceMoveId {
  return typeof value === "string" && BY_ID.has(value);
}

const scratch: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

/** Cubic Hermite through b and c, with tangents from a and d (Catmull-Rom). */
function curve3(
  out: Vec3,
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  u: number,
  ta: number,
  tb: number,
  tc: number,
  td: number,
) {
  const u2 = u * u;
  const u3 = u2 * u;
  const span = tc - tb;
  for (let k = 0; k < 3; k++) {
    // tangents scaled to this segment's length, so uneven key spacing flows
    const m0 = ((c[k] - a[k]) / (tc - ta)) * span;
    const m1 = ((d[k] - b[k]) / (td - tb)) * span;
    out[k] =
      (2 * u3 - 3 * u2 + 1) * b[k] +
      (u3 - 2 * u2 + u) * m0 +
      (-2 * u3 + 3 * u2) * c[k] +
      (u3 - u2) * m1;
  }
}

/**
 * Samples a move at time `t` (seconds, any value, looped) into `out`.
 * Motion flows through every key on a smooth curve rather than stopping at
 * each one. Writes in place so a doll reuses one pose per frame.
 */
export function poseAt(move: DanceMove, t: number, out = createPose()): Pose {
  const { keys, period } = move;
  out.captured = move.captured === true;
  out.groove = move.groove !== false;
  const n = keys.length;
  const local = ((t % period) + period) % period;
  let i = 0;
  while (i + 1 < n && keys[i + 1].at <= local) i += 1;
  // the four keys around this segment, wrapping the loop at both ends
  const key = (k: number) => keys[((k % n) + n) % n];
  const time = (k: number) => {
    const wraps = Math.floor(k / n);
    return keys[((k % n) + n) % n].at + wraps * period;
  };
  const [ta, tb, tc, td] = [time(i - 1), time(i), time(i + 1), time(i + 2)];
  const span = tc - tb;
  const u = span > 0 ? Math.min(1, Math.max(0, (local - tb) / span)) : 0;
  const [ka, kb, kc, kd] = [key(i - 1), key(i), key(i + 1), key(i + 2)];
  if (n === 1) {
    // a held pose: copy in place, so a posing doll allocates nothing
    const r = kb.root ?? ZERO;
    out.root[0] = r[0];
    out.root[1] = r[1];
    out.root[2] = r[2];
    for (const j of JOINTS) {
      const v = kb.joints?.[j] ?? ZERO;
      const o = out.joints[j];
      o[0] = v[0];
      o[1] = v[1];
      o[2] = v[2];
    }
    return out;
  }
  const [a, b, c, d] = scratch;
  const pick = (k: Key, j: Joint | null, into: Vec3) => {
    const v = (j ? k.joints?.[j] : k.root) ?? ZERO;
    into[0] = v[0];
    into[1] = v[1];
    into[2] = v[2];
    return into;
  };
  curve3(
    out.root,
    pick(ka, null, a),
    pick(kb, null, b),
    pick(kc, null, c),
    pick(kd, null, d),
    u,
    ta,
    tb,
    tc,
    td,
  );
  for (const j of JOINTS) {
    curve3(
      out.joints[j],
      pick(ka, j, a),
      pick(kb, j, b),
      pick(kc, j, c),
      pick(kd, j, d),
      u,
      ta,
      tb,
      tc,
      td,
    );
  }
  return out;
}
