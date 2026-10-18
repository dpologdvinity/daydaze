// Skyline Supply, Downtown's grocery store on the avenue: four aisles of
// shelves, produce bins by the door, a freezer wall at the back and two
// checkout lanes with a cashier, and a security guard by the door. Buy a
// snack or a water at the till; either takes the edge off a buzz. One
// layout, shared by the room's floor and blockers (rooms.ts) and the scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -9, x1: 9, z0: -8, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const MARKET_DOOR = {
  position: [-124, 12.5] as const,
  landing: [-124, 9] as const,
};

/** Shelving runs north-south: x center, from z0 to z1, 0.9 m deep. */
export const AISLES: readonly { x: number; z0: number; z1: number }[] = [
  -6, -2.6, 0.8, 4.2,
].map((x) => ({ x, z0: -5.6, z1: 0.6 }));
export const SHELF_DEPTH = 0.9;

/** The freezer wall along the back. */
export const FREEZERS = { x0: -8.4, x1: 8.4, z0: -8, z1: -7.2 } as const;

/** Produce bins by the door, west side. */
export const PRODUCE = { x0: -8.6, x1: -5, z0: 2.2, z1: 4 } as const;

/** Two checkout counters by the door, east side, running north-south. */
export const CHECKOUTS: readonly { x: number; z0: number; z1: number }[] = [
  { x: 3.4, z0: 2.4, z1: 4.6 },
  { x: 6.2, z0: 2.4, z1: 4.6 },
];
export const CASHIER: Vec2 = [3.95, 3.5];
export const GUARD: Vec2 = [-2.2, 5.6];

/** Coins for a snack and for a bottle of water. */
export const PRICES = { snack: 3, water: 2 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...AISLES.map((a) =>
    box(a.x - SHELF_DEPTH / 2, a.z0, a.x + SHELF_DEPTH / 2, a.z1),
  ),
  box(FREEZERS.x0, FREEZERS.z0, FREEZERS.x1, FREEZERS.z1),
  box(PRODUCE.x0, PRODUCE.z0, PRODUCE.x1, PRODUCE.z1),
  ...CHECKOUTS.map((c) => box(c.x - 0.4, c.z0, c.x + 0.4, c.z1)),
];
