// Petal & Stem, the florist on Park Avenue: a bright greenhouse-style shop with
// a bucket of each stem along the side walls, a wrapping counter at the back and
// Willa behind it. One layout, shared by the room's floor and blockers
// (rooms.ts) and the client's scene.
import type { Vec2 } from "./walk.ts";
import type { Stem } from "./florist.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -5, x1: 5, z0: -5, z1: 5 } as const;
export const SPAWN: Vec2 = [0, 3.6];
export const EXIT: Vec2 = [0, 4.6];
/** The street door on Park Avenue's south side, and where you stand outside. */
export const FLORIST_DOOR = {
  position: [290, -244.6] as const,
  landing: [290, -248.6] as const,
};

/** The wrapping counter along the back wall, and the florist behind it. */
export const COUNTER = { x0: -2.4, x1: 2.4, z0: -3.9, z1: -3.1 } as const;
export const CLERK: Vec2 = [0, -4.5];
/** Where the bouquet in progress stands, on the counter. */
export const BOUQUET_SPOT: Vec2 = [0, -3.5];
export const COUNTER_TOP = 1;

/** A bucket of each stem: four down the west wall, four down the east wall. */
export const BUCKETS: readonly { stem: Stem; at: Vec2 }[] = [
  { stem: "rose", at: [-4.1, -2.4] },
  { stem: "tulip", at: [-4.1, -0.6] },
  { stem: "sunflower", at: [-4.1, 1.2] },
  { stem: "peony", at: [-4.1, 3] },
  { stem: "lily", at: [4.1, -2.4] },
  { stem: "daisy", at: [4.1, -0.6] },
  { stem: "babys-breath", at: [4.1, 1.2] },
  { stem: "eucalyptus", at: [4.1, 3] },
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(COUNTER.x0, BOUNDS.z0, COUNTER.x1, -4.2),
  ...BUCKETS.map(({ at: [x, z] }) =>
    box(x - 0.55, z - 0.55, x + 0.55, z + 0.55),
  ),
];
