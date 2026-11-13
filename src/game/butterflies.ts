// Butterflies: small flocks that flutter over Uptown's park, Larkspur Forest and
// the Community Garden by day. Each butterfly wanders a slow Lissajous loop
// over its flock's box, turned to face the way it flies; the wings flap in the
// client's vertex shader. Pure: `flutter` fills a pose for any time, so the
// client allocates nothing per frame. Butterflies.tsx draws them.
import { hash } from "./city/hash.ts";
import { GROUND, PARK } from "./city/park.ts";
import { GLADES } from "./forest.ts";
import { BOUNDS as GARDEN } from "./garden.ts";

export type Box = { x0: number; x1: number; z0: number; z1: number };

export type Flock = {
  /** The ground the flock flutters over; a butterfly stays inside this box. */
  box: Box;
  /** Height of the ground under it. */
  ground: number;
  /** Butterflies drawn on the low and the high quality tier. */
  count: { low: number; high: number };
};

/** Where a butterfly is: position, and yaw about y (its head is on +z). */
export type Pose = { x: number; y: number; z: number; yaw: number };

/** A butterfly's size: wingspan in meters. */
export const WINGSPAN = 0.3;
/** How high above the ground a butterfly flies, lowest and highest. */
export const FLIGHT = { min: 0.35, max: 2.2 } as const;
/** How near (meters, from a flock's box) the player must be for the park's
 * butterflies to exist, on the low and the high tier. */
export const BUTTERFLY_RANGE = { low: 35, high: 70 } as const;
/** Above this daylight (0 night to 1 day) butterflies are out. */
export const OUT_AT = 0.35;

/** Flocks over the park's lawns: the east lawn, the market green and the west lawn and pond. */
export const PARK_FLOCKS: readonly Flock[] = [
  {
    box: { x0: 258, x1: 276, z0: -285, z1: -270 },
    ground: GROUND,
    count: { low: 4, high: 7 },
  },
  {
    box: { x0: 240, x1: 251, z0: -310, z1: -294 },
    ground: GROUND,
    count: { low: 3, high: 6 },
  },
  {
    box: { x0: 206, x1: 224, z0: -312, z1: -293 },
    ground: GROUND,
    count: { low: 4, high: 7 },
  },
];

/** Flocks over Larkspur Forest's meadow glades. */
export const FOREST_FLOCKS: readonly Flock[] = [
  { box: GLADES.meadow, ground: 0, count: { low: 6, high: 10 } },
  { box: GLADES.west, ground: 0, count: { low: 4, high: 7 } },
  { box: GLADES.east, ground: 0, count: { low: 4, high: 7 } },
];

/** Flocks over the Community Garden's raised beds. */
export const GARDEN_FLOCKS: readonly Flock[] = [
  {
    box: { x0: -14, x1: 14, z0: -6, z1: 7 },
    ground: 0,
    count: { low: 8, high: 14 },
  },
];

/** How many butterflies a tier draws across flocks. */
export const countOf = (
  flocks: readonly Flock[],
  tier: "low" | "high",
): number => flocks.reduce((n, f) => n + f.count[tier], 0);

/** Meters from `box` to (x, z); 0 inside it. */
export function distanceTo(box: Box, x: number, z: number): number {
  return Math.hypot(
    Math.max(box.x0 - x, 0, x - box.x1),
    Math.max(box.z0 - z, 0, z - box.z1),
  );
}

/** Whether the flock is close enough to the player to be drawn on `tier`. */
export const flockNear = (
  flock: Flock,
  x: number,
  z: number,
  tier: "low" | "high",
): boolean => distanceTo(flock.box, x, z) <= BUTTERFLY_RANGE[tier];

/** Whether it is light enough for butterflies (`sun` is Daylight.sun). */
export const isOut = (sun: number): boolean => sun > OUT_AT;

/** One butterfly's loop: a rate and a phase for each of its sines. */
export type Wander = {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  /** Rate and phase of its lazy rise and fall, and of its wing-beat bob. */
  wy: number;
  py: number;
  pb: number;
};

/** Butterfly `i` of the flock seeded `seed`: its loop, the same every load. */
export function wanderOf(seed: number, i: number): Wander {
  const r = (k: number) => hash(seed, i, k);
  return {
    w1: 0.08 + r(1) * 0.08,
    w2: 0.17 + r(2) * 0.1,
    w3: 0.09 + r(3) * 0.08,
    w4: 0.19 + r(4) * 0.1,
    p1: r(5) * 6.283,
    p2: r(6) * 6.283,
    p3: r(7) * 6.283,
    p4: r(8) * 6.283,
    wy: 0.12 + r(9) * 0.1,
    py: r(10) * 6.283,
    pb: r(11) * 6.283,
  };
}

/**
 * A butterfly on its `loop` at time `t` seconds, written into `out`. Two slow
 * sines per axis (a loop of 30 to 75 s) keep it inside the flock's box and
 * make the path wander; `yaw` follows the path's own velocity. Allocates
 * nothing: the client calls it every frame.
 */
export function flutter(
  flock: Flock,
  loop: Wander,
  t: number,
  out: Pose,
): Pose {
  const cx = (flock.box.x0 + flock.box.x1) / 2;
  const cz = (flock.box.z0 + flock.box.z1) / 2;
  const hx = (flock.box.x1 - flock.box.x0) / 2;
  const hz = (flock.box.z1 - flock.box.z0) / 2;
  const a1 = t * loop.w1 + loop.p1;
  const a2 = t * loop.w2 + loop.p2;
  const a3 = t * loop.w3 + loop.p3;
  const a4 = t * loop.w4 + loop.p4;
  // weights 0.65 and 0.35 sum to 1, so the path never leaves the box
  out.x = cx + hx * (0.65 * Math.sin(a1) + 0.35 * Math.sin(a2));
  out.z = cz + hz * (0.65 * Math.sin(a3) + 0.35 * Math.sin(a4));
  const dx =
    hx * (0.65 * loop.w1 * Math.cos(a1) + 0.35 * loop.w2 * Math.cos(a2));
  const dz =
    hz * (0.65 * loop.w3 * Math.cos(a3) + 0.35 * loop.w4 * Math.cos(a4));
  out.yaw = Math.atan2(dx, dz);
  const mid = (FLIGHT.min + FLIGHT.max) / 2;
  const half = (FLIGHT.max - FLIGHT.min) / 2 - 0.1;
  // a lazy rise and fall, plus the small bob of each wing beat
  out.y =
    flock.ground +
    mid +
    half * Math.sin(t * loop.wy + loop.py) +
    0.1 * Math.sin(t * 7 + loop.pb);
  return out;
}

/** The place a flock list belongs to, for tests: every box lies inside it. */
export const PLACES: Record<string, Box> = {
  park: PARK,
  forest: { x0: -28, x1: 28, z0: -50, z1: 22 },
  garden: { x0: GARDEN.x0, x1: GARDEN.x1, z0: GARDEN.z0, z1: GARDEN.z1 },
};
