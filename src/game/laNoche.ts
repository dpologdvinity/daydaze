// La Noche: a Latin night club on Nightlife Row's west street, beside the
// Velvet Room. A band stage at the back, a tiled dance floor, the bar on
// the right and tables on the left. One layout, shared by the room's floor
// and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: the stage's front at the back, the door at the front. */
export const FLOOR_BOUNDS = { x0: -6, x1: 6, z0: -3.6, z1: 5.8 } as const;

/** The band's stage, raised across the back. */
export const STAGE = { x0: -4, x1: 4, z0: -6, z1: -3.8, height: 0.45 } as const;

/** The dance floor's center and half size. */
export const DANCE: Vec2 = [-0.4, 0.4];
export const DANCE_HALF = 2.4;

/** The bar along the right wall; its front at x = BAR.front. */
export const BAR = { front: 5.2, back: 6, z0: -2.6, z1: 2.6 } as const;
export const STOOL_X = 4.75;
export const STOOL_ZS: readonly number[] = [-1.8, -0.6, 0.6, 1.8];

/** Round tables down the left wall, two chairs at each, facing the floor. */
export const TABLES: readonly Vec2[] = [
  [-5, -1.4],
  [-5, 1.6],
];
export const TABLE_SEATS: readonly Vec2[] = TABLES.flatMap(([x, z]) =>
  [-0.75, 0.75].map((dz): Vec2 => [x + 0.75, z + dz]),
);

export const EXIT: Vec2 = [0, 5.4];
export const SPAWN: Vec2 = [0, 4.3];
export const LA_NOCHE_DOOR = {
  position: [72.2, -40] as const,
  landing: [70, -40] as const,
};
/** The club's building on the street: its west face is the front. */
export const LA_NOCHE_LOT = { x0: 74, x1: 98, z0: -64, z1: -18 } as const;

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
  box(BAR.front, BAR.z0, BAR.back, BAR.z1),
  ...TABLES.map(([x, z]) => box(x - 0.4, z - 0.4, x + 0.4, z + 0.4)),
];
