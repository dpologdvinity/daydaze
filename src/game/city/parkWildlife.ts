// Wildlife on Uptown's park lawns (park.ts): deer, a fox and rabbits wander
// loops round their pens, and a doe (the one textured, three-material model,
// so high tier only) browses the west lawn. Pens sit clear of the paths, the
// pond and the bandstand. Pure data; ParkWildlife.tsx draws it.
import type { LandKind } from "../creatures.ts";
import type { Rect } from "../zoo.ts";
import { GROUND, PARK } from "./park.ts";

export type Wildlife = {
  kind: LandKind;
  pen: Rect;
  /** Meters per second while walking. */
  speed: number;
  /** Starting angle round the loop. */
  phase: number;
  dir: 1 | -1;
  /** Only drawn on the high quality tier. */
  highOnly?: boolean;
};

const EAST_LAWN: Rect = { x0: 258, x1: 296, z0: -285, z1: -268 };
const RABBIT_PEN: Rect = { x0: 262, x1: 274, z0: -284, z1: -272 };
const SW_LAWN: Rect = { x0: 206, x1: 222, z0: -285, z1: -272 };
const WEST_LAWN: Rect = { x0: 205, x1: 217, z0: -312, z1: -292 };

export const WILDLIFE: readonly Wildlife[] = [
  { kind: "deer", pen: EAST_LAWN, speed: 0.6, phase: 0, dir: 1 },
  {
    kind: "deer",
    pen: EAST_LAWN,
    speed: 0.5,
    phase: 3.3,
    dir: -1,
    highOnly: true,
  },
  { kind: "rabbit", pen: RABBIT_PEN, speed: 0.5, phase: 1, dir: 1 },
  {
    kind: "rabbit",
    pen: RABBIT_PEN,
    speed: 0.4,
    phase: 4,
    dir: -1,
    highOnly: true,
  },
  { kind: "fox", pen: SW_LAWN, speed: 0.7, phase: 2, dir: 1 },
  {
    kind: "doe",
    pen: WEST_LAWN,
    speed: 0.5,
    phase: 0.5,
    dir: 1,
    highOnly: true,
  },
];

/** The animals drawn on `tier`: the low tier skips the high-only ones. */
export const wildlifeFor = (tier: "low" | "high"): readonly Wildlife[] =>
  tier === "low" ? WILDLIFE.filter((w) => !w.highOnly) : WILDLIFE;

/** Where the lawn's ground is, for the animals' feet. */
export const WILDLIFE_Y = GROUND;

/** How near (meters, from the park's box) the player must be for the animals to exist. */
export const WILDLIFE_RANGE = 60;

/** Whether a player at (x, z) is close enough to the park to see its wildlife. */
export function wildlifeNear(x: number, z: number): boolean {
  const dx = Math.max(PARK.x0 - x, 0, x - PARK.x1);
  const dz = Math.max(PARK.z0 - z, 0, z - PARK.z1);
  return Math.hypot(dx, dz) < WILDLIFE_RANGE;
}
