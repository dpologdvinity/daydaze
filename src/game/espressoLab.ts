// Espresso Lab on Gallery Row: a third-wave coffee bar. A long counter with
// a chrome espresso machine and a pastry case, a chalkboard menu, shelves
// of bean bags, cafe tables by the window and a barista station where the
// player can take a shift (barista.ts). One layout, shared by the room's
// floor and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -7, x1: 7, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const ESPRESSO_DOOR = {
  position: [-32, -245.5] as const,
  landing: [-32, -249.5] as const,
};

/** The counter along the back, the machine on it and the barista behind. */
export const COUNTER = { x0: -5, x1: 4, z0: -4.2, z1: -3.4 } as const;
export const MACHINE_X = -1.5;
export const BARISTA: Vec2 = [-3, -5];
/** Where the player stands to work the station. */
export const STATION: Vec2 = [MACHINE_X, -2.8];
/** Cafe tables down the window side, two chairs each. */
export const TABLES: readonly Vec2[] = [
  [-4.6, 1.4],
  [-1.6, 2.4],
  [4.4, 0.6],
  [4.4, 3.4],
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  // the back counter under the shelves
  box(COUNTER.x0, -6, COUNTER.x1, -5.5),
  ...TABLES.map(([x, z]) => box(x - 0.4, z - 0.4, x + 0.4, z + 0.4)),
];
