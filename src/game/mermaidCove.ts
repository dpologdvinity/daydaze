// Mermaid Cove, through a gate on Shore Boulevard: a crescent of sand
// round a moonlit lagoon (to -z), rocks where the mermaids sit and swim,
// the sea cave's arch beyond, and four singing shells at the water's edge
// for Siren Song. One layout, shared by the room's floor (rooms.ts), its
// seats and the client's scene.
import type { Vec2 } from "./walk.ts";

export const SAND = { x0: -10, x1: 10, z0: 2, z1: 9 } as const;
/** The lagoon's surface, just under the sand. */
export const WATER_Y = -0.05;
/** The singing shells along the waterline, one per note. */
export const SHELL_SPOTS: readonly Vec2[] = [-4.5, -1.5, 1.5, 4.5].map(
  (x): Vec2 => [x, 2.7],
);
/** Driftwood logs up the beach to sit on, facing the lagoon. */
export const LOG_SEATS: readonly Vec2[] = [-7.6, -6.8, 6.8, 7.6].map(
  (x): Vec2 => [x, 6.2],
);
export const SPAWN: Vec2 = [0, 7.6];
export const EXIT: Vec2 = [0, 8.7];
export const COVE_DOOR = {
  position: [172, 244.4] as const,
  landing: [172, 247.6] as const,
};

export const FLOOR: readonly Vec2[] = [
  [SAND.x0, SAND.z0],
  [SAND.x1, SAND.z0],
  [SAND.x1, SAND.z1],
  [SAND.x0, SAND.z1],
];

/**
 * The lagoon's rocks: two long, flat-topped ones the mermaids lounge on
 * (`yaw` turns rock and mermaid together, her tail along the rock) and two
 * plain boulders. `r` is the footprint's radius, for keeping swimmers clear.
 */
export const COVE_ROCKS = [
  { x: -7, z: -3.5, yaw: -2.05, r: 2.9, lounge: true },
  { x: 7.2, z: -6, yaw: 2.05, r: 2.9, lounge: true },
  { x: -5.5, z: -9.5, yaw: 0.6, r: 1.1, lounge: false },
  { x: 9.5, z: -1.5, yaw: 2.2, r: 0.9, lounge: false },
] as const;

/** A swim loop round the lagoon: an ellipse, `rate` radians a second. */
export type SwimLoop = {
  center: Vec2;
  radii: Vec2;
  rate: number;
  /** Where on the ellipse she starts, in radians. */
  phase: number;
};

/** Two loops at the waterline, one near the beach and one out by the cave;
 * a negative rate swims the other way round. About 0.8 m/s each. */
export const SWIM_LOOPS: readonly SwimLoop[] = [
  { center: [0.5, -3], radii: [2.4, 1.2], rate: 0.42, phase: 0 },
  { center: [0.5, -9.8], radii: [3, 1.4], rate: -0.33, phase: 2 },
];

/** Where the singer rises to sing Siren Song, in the shallows off the shells. */
export const SINGER_SPOT: Vec2 = [0, 0.4];

/**
 * Where a mermaid on `loop` is `t` seconds in, and the yaw that turns her
 * nose (the model's -z) along the path.
 */
export function swimPose(
  loop: SwimLoop,
  t: number,
): { x: number; z: number; yaw: number } {
  const a = loop.phase + loop.rate * t;
  const [rx, rz] = loop.radii;
  // the velocity's direction; its sign follows the rate
  const vx = -rx * Math.sin(a) * Math.sign(loop.rate);
  const vz = rz * Math.cos(a) * Math.sign(loop.rate);
  return {
    x: loop.center[0] + rx * Math.cos(a),
    z: loop.center[1] + rz * Math.sin(a),
    yaw: Math.atan2(-vx, -vz),
  };
}
