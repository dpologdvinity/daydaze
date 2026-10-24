// Lechon and Kamayan Hall: Little Manila's sit-down Filipino restaurant.
// A long boodle-fight table down the middle with benches both sides, the
// lechon carving station on the west wall, and a videoke corner in the
// east. Its door and spawn are the food interiors' (food/interiors.ts), so
// the street storefront lands you in the same place.
import { INTERIOR_EXIT, INTERIOR_SPAWN } from "./food/interiors.ts";
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -7, x1: 7, z0: -6, z1: 5.6 } as const;

/** The boodle table: banana leaves end to end, x0..x1 at z. */
export const TABLE = { x0: -4.5, x1: 4.5, z: -1.6, half: 0.6 } as const;
/** Bench seats both sides of the table, every 0.9 m, facing it. */
export const TABLE_SEATS: readonly { at: Vec2; facing: Vec2 }[] = [
  -1, 1,
].flatMap((side) =>
  Array.from({ length: 10 }, (_, i) => {
    const x = TABLE.x0 + 0.45 + i * 0.9;
    return {
      at: [x, TABLE.z + side * (TABLE.half + 0.45)] as Vec2,
      facing: [x, TABLE.z] as Vec2,
    };
  }),
);
/** Bench seats the family already sit in (Lola Nena at 9), so they aren't
 * offered to the player. */
export const DINER_SEATS: readonly number[] = [3, 5, 9, 12, 16];

/** The carving station on the west wall, the server in front of it. */
export const CARVING = { x0: -7, x1: -5.9, z0: -4.5, z1: 0.5 } as const;
export const SERVER: Vec2 = [-5.4, -2];
/** The videoke corner by the door: the screen on the front wall, a sofa
 * turned to face it (its back to the table). */
export const VIDEOKE: Vec2 = [5.2, 5.5];
export const SOFA = { x0: 4.2, x1: 6.2, z0: 2.6, z1: 3.4 } as const;

/** The cook-off kitchen: two stoves against the back wall, each with the
 * spot its cook stands at, facing the wall. */
export const STOVES: readonly { x: number; z: number; cook: Vec2 }[] = [
  { x: 1.4, z: -5.5, cook: [1.4, -4.6] },
  { x: 3.8, z: -5.5, cook: [3.8, -4.6] },
];
/** Half a stove's width and depth. */
export const STOVE_HALF = { x: 0.6, z: 0.4 } as const;

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
  FLOOR_BOUNDS.x0,
  FLOOR_BOUNDS.z0,
  FLOOR_BOUNDS.x1,
  FLOOR_BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(
    TABLE.x0 - 0.1,
    TABLE.z - TABLE.half,
    TABLE.x1 + 0.1,
    TABLE.z + TABLE.half,
  ),
  box(CARVING.x0, CARVING.z0, CARVING.x1, CARVING.z1),
  // the sofa's back half: its cushions' front is left clear to sit down
  box(SOFA.x0, SOFA.z0, SOFA.x1, SOFA.z1 - 0.4),
  ...STOVES.map((s) =>
    box(
      s.x - STOVE_HALF.x,
      s.z - STOVE_HALF.z,
      s.x + STOVE_HALF.x,
      s.z + STOVE_HALF.z,
    ),
  ),
];
