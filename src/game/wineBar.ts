// Cellar 214 on Park Avenue: a wine bar in a vaulted brick cellar. A bar
// along the back with a wall of bottles in diamond racks, barrel tables
// with high stools, candles, and a sommelier who lets you pour a flight
// (winePour.ts). One layout, shared by the room's floor and blockers
// (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -8, x1: 8, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const WINE_DOOR = {
  position: [214, -244.6] as const,
  landing: [214, -248.6] as const,
};

/** The bar along the back, its stools and the sommelier behind it. */
export const BAR = { x0: -5, x1: 3.5, z0: -4.6, z1: -3.8 } as const;
export const STOOL_Z = -3.1;
export const STOOL_XS: readonly number[] = [-4.2, -2.8, -1.4, 0, 1.4, 2.8];
export const SOMMELIER: Vec2 = [-0.6, -5.3];
/** Barrel tables on the east side, two high stools each. */
export const BARRELS: readonly Vec2[] = [
  [5.4, -1.4],
  [5.4, 2],
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
  box(BAR.x0, -6, BAR.x1, -5.6),
  ...BARRELS.map(([x, z]) => box(x - 0.45, z - 0.45, x + 0.45, z + 0.45)),
];
