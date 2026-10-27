// Seaside Swim, through the gate at the beach end of Shore Boulevard: a strip
// of sand with the dive shack on it, then the sea (to -z). Wade in from the
// waterline, swim out past the buoys, and the dive buoy out in the deep drops
// to the reef. One layout shared by the room's floor (rooms.ts), the player's
// swim state (PlayerController) and the client's scene. Pure.

import type { Vec2 } from "./walk.ts";

/** The waterline: sand is at z >= SHORE_Z, the sea beyond it (smaller z). */
export const SHORE_Z = 3;
export const SAND = { x0: -22, x1: 22, z0: SHORE_Z, z1: 13 } as const;
/** The farthest the sea is walkable, and its half width. */
export const SEA = { x: 30, far: -64 } as const;

export const SPAWN: Vec2 = [0, 10.6];
export const EXIT: Vec2 = [0, 12.3];
export const WATER_DOOR = {
  position: [124, 244.4] as const,
  landing: [124, 247.6] as const,
};

/** The dive shack on the sand, and where its rental counter's customers stand. */
export const SHACK = { x: 13.5, z: 8, w: 6, d: 4.2 } as const;
export const COUNTER: Vec2 = [10, 7.2];
/** The dive buoy out in the deep: swim into it to go down (with gear). */
export const DIVE_BUOY: Vec2 = [0, -30];
export const DIVE_RADIUS = 2.2;
/** Where the reef's ladder brings a diver back up. */
export const SURFACE_LANDING: Vec2 = [0, -27];
/** Swim lane buoys, a rope of floats across the swimming area. */
export const LANE_BUOYS: readonly Vec2[] = [-18, -12, -6, 6, 12, 18].map(
  (x): Vec2 => [x, -16],
);

export const FLOOR: readonly Vec2[] = [
  [-SEA.x, SEA.far],
  [SEA.x, SEA.far],
  [SEA.x, SAND.z1],
  [-SEA.x, SAND.z1],
];

/**
 * Sea depth, meters, at a point: 0 on the sand, a gentle wade to waist depth
 * in the first four meters, then a steady slope out to the deep.
 */
export function depthAt(_x: number, z: number): number {
  const out = SHORE_Z - z;
  if (out <= 0) return 0;
  if (out < 4) return out * 0.2;
  return Math.min(8, 0.8 + (out - 4) * 0.16);
}

export type WaterState = "dry" | "wade" | "swim";

/** How the player moves at a depth: standing, wading, or afloat. */
export function waterState(depth: number): WaterState {
  if (depth < 0.12) return "dry";
  return depth < 0.85 ? "wade" : "swim";
}

/** Walking pace multiplier in the water: wading drags, swimming is slower. */
export function paceIn(state: WaterState): number {
  return state === "dry" ? 1 : state === "wade" ? 0.8 : 0.62;
}

/** A school of fish circling a point in the sea (metres; y is below the surface). */
export type School = {
  kind: "cute-clownfish" | "cute-bluetang" | "cute-yellowtang" | "fish1";
  at: Vec2;
  /** Meters below the surface. */
  below: number;
  radius: number;
  count: number;
};

export const SCHOOLS: readonly School[] = [
  { kind: "cute-yellowtang", at: [-8, -9], below: 0.9, radius: 2.6, count: 5 },
  { kind: "cute-bluetang", at: [9, -13], below: 1.2, radius: 3, count: 5 },
  { kind: "cute-clownfish", at: [-3, -22], below: 1.4, radius: 2.4, count: 4 },
  { kind: "fish1", at: [14, -26], below: 1.6, radius: 3.2, count: 4 },
];

/** The dolphin pod, offshore: each loops an arc, leaping at the top. */
export const DOLPHINS: readonly {
  center: Vec2;
  radius: number;
  phase: number;
}[] = [
  { center: [-16, -46], radius: 7, phase: 0 },
  { center: [-12, -50], radius: 8, phase: 2.1 },
  { center: [-19, -42], radius: 6, phase: 4.2 },
];

/** Gulls and crabs on the beach. */
export const GULLS: readonly { at: Vec2; yaw: number }[] = [
  { at: [-12, 6.5], yaw: 0.6 },
  { at: [-10.8, 7.4], yaw: 1.1 },
  { at: [5, 5], yaw: -0.4 },
];
export const CRABS: readonly Vec2[] = [
  [-6, 4.2],
  [7.5, 4.6],
  [17, 5.4],
];
/** Gulls wheeling high over the surf, as circles round a point. */
export const FLYING_GULLS: readonly { center: Vec2; radius: number }[] = [
  { center: [-6, -4], radius: 5 },
  { center: [8, -8], radius: 6.5 },
];
