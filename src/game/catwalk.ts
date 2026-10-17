// The Catwalk: a fashion house in the Arts District, in the warehouse on
// Gallery Row's south side. One long glossy runway down the middle of the
// hall, backstage at its north end and the judges' table past its south
// end, by the door. Runway Walk is a show judged like the gym's floor
// routine (gymnastics.ts): eight cues down the runway and back. One layout,
// shared by the room's floor and blockers (rooms.ts) and the client's scene.
import type { Element } from "./gymnastics.ts";
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -8, x1: 8, z0: -11, z1: 9 } as const;
/** The runway: raised, centred on x = 0, from backstage to its end. */
export const RUNWAY = { half: 1.1, z0: -10, z1: 3, height: 0.4 } as const;
/** The judges' table, facing the runway's end; they sit on its door side. */
export const JUDGES = { x0: -2.1, x1: 2.1, z0: 5.2, z1: 5.9 } as const;
export const JUDGE_XS: readonly number[] = [-1.4, 0, 1.4];
export const JUDGE_Z = 6.4;
/** Where the audience stands, either side of the runway, facing it. */
export const AUDIENCE: readonly Vec2[] = [-1, 1].flatMap((side) =>
  [-5.5, -0.5].map((z): Vec2 => [side * 3, z]),
);

export const SPAWN: Vec2 = [0, 7.6];
export const EXIT: Vec2 = [0, 8.7];
export const CATWALK_DOOR = {
  position: [2, -245.5] as const,
  landing: [2, -249.5] as const,
};

export type PoseKind = "strut" | "pose" | "twirl";

/** Runway Walk: struts on the way down, poses at the end, a twirl on the
 * way back and the walk home to the judges. */
export const PROGRAM: readonly (Element & { kind: PoseKind })[] = [
  { name: "Step out", at: 2, move: "groove", difficulty: 0.1, kind: "strut" },
  { name: "Hip sway", at: 4, move: "shimmy", difficulty: 0.1, kind: "strut" },
  { name: "End pose", at: 6.4, move: "voguing", difficulty: 0.2, kind: "pose" },
  {
    name: "Over the shoulder",
    at: 8.2,
    move: "voguing",
    difficulty: 0.2,
    kind: "pose",
  },
  { name: "Twirl", at: 10, move: "groove", difficulty: 0.3, kind: "twirl" },
  {
    name: "Hair flip",
    at: 12.2,
    move: "hair-flip",
    difficulty: 0.2,
    kind: "pose",
  },
  {
    name: "Power strut",
    at: 14.2,
    move: "body-roll",
    difficulty: 0.2,
    kind: "strut",
  },
  {
    name: "Final pose",
    at: 16.4,
    move: "voguing",
    difficulty: 0.3,
    kind: "pose",
  },
];
export const PROGRAM_SECONDS = 18;

/** Her walk as [seconds, z, yaw] keys (yaw 0 faces the judges): down the
 * runway, a pose at the end, back to the middle, and down again. */
const WALK: readonly (readonly [number, number, number])[] = [
  [0, -9.2, 0],
  [5.6, 2.4, 0],
  [7.4, 2.4, 0],
  [8.2, 2.4, Math.PI],
  [11.4, -4.2, Math.PI],
  [12.2, -4.2, Math.PI * 2],
  [15.6, 2.4, Math.PI * 2],
];

/** Where she is on the runway `t` seconds into the show, which way she
 * faces, and whether she's walking (not holding a pose or turning). */
export function strutAt(t: number): {
  z: number;
  yaw: number;
  stride: boolean;
} {
  const i = WALK.findIndex(([at]) => at > t);
  if (i <= 0) {
    const [, z, yaw] = WALK[i === 0 ? 0 : WALK.length - 1];
    return { z, yaw, stride: false };
  }
  const [t0, z0, y0] = WALK[i - 1];
  const [t1, z1, y1] = WALK[i];
  const f = (t - t0) / (t1 - t0);
  return { z: z0 + (z1 - z0) * f, yaw: y0 + (y1 - y0) * f, stride: z1 !== z0 };
}

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(
  FLOOR_BOUNDS.x0,
  FLOOR_BOUNDS.z0,
  FLOOR_BOUNDS.x1,
  FLOOR_BOUNDS.z1,
);
/** The runway (only the show walks it) and the judges' table and chairs. */
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(-RUNWAY.half, RUNWAY.z0, RUNWAY.half, RUNWAY.z1),
  box(JUDGES.x0, JUDGES.z0, JUDGES.x1, JUDGE_Z + 0.4),
];
