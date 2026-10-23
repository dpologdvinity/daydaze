// Lune Tasting Room, on Park Avenue in Uptown: a candlelit date spot. Two
// columns of tables for two down a center aisle, a chair either side of
// each, a grand piano at the back under the moon, and the pass where the
// server brings out the courses. Its door and spawn are the food
// interiors' (food/interiors.ts), so the street storefront lands you here.
import { INTERIOR_EXIT, INTERIOR_SPAWN } from "./food/interiors.ts";
import type { Vec2 } from "./walk.ts";

export const BOUNDS = { x0: -6, x1: 6, z0: -5, z1: 5.6 } as const;

/** The tables for two, by their centers; chairs north and south of each. */
export const TABLES: readonly Vec2[] = [-3, 3].flatMap((x) =>
  [-2.6, 0.2].map((z): Vec2 => [x, z]),
);
export const TABLE_HALF = 0.4;
export const CHAIR_OFFSET = 0.75;
export const CHAIR_HEIGHT = 0.47;

/** Each table's two chairs, facing across it. */
export const CHAIRS: readonly { at: Vec2; facing: Vec2; table: number }[] =
  TABLES.flatMap(([x, z], table) =>
    [-1, 1].map((side) => ({
      at: [x, z + side * CHAIR_OFFSET] as Vec2,
      facing: [x, z] as Vec2,
      table,
    })),
  );

/** A couple already on a date at one table, so its chairs aren't offered. */
export const DATE_TABLE = 3;

/** The grand piano at the back, the pianist on her bench before it. */
export const PIANO = { x0: -1.4, x1: 1.4, z0: -5, z1: -3.6 } as const;
export const PIANIST: Vec2 = [0, -3.25];
/** The pass to the kitchen in the back right corner, the server by it. */
export const PASS = { x0: 4.2, x1: 6, z0: -5, z1: -4.2 } as const;
export const SERVER: Vec2 = [4.6, -3.7];

export const SPAWN = INTERIOR_SPAWN;
export const EXIT = INTERIOR_EXIT;

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...TABLES.map(([x, z]) =>
    box(x - TABLE_HALF, z - TABLE_HALF, x + TABLE_HALF, z + TABLE_HALF),
  ),
  box(PIANO.x0, PIANO.z0, PIANO.x1, PIANO.z1),
  box(PASS.x0, PASS.z0, PASS.x1, PASS.z1),
];
