// The Skate-Up Drive-In Diner in Suburbia: a fifties diner where the
// servers glide between the tables on roller skates. A counter with stools
// along the back wall, booths down the west side, the jukebox in the east
// corner and the skaters' loop through the middle. Its door and spawn are
// the food interiors' (food/interiors.ts), like Kamayan Hall's.
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -7, x1: 7, z0: -6, z1: 5.6 } as const;

/** The counter along the back wall, and its stools in front. */
export const COUNTER = { x0: -5, x1: 3, z0: -5.6, z1: -4.8 } as const;
export const STOOLS: readonly Vec2[] = [-4, -2.6, -1.2, 0.2, 1.6].map(
  (x): Vec2 => [x, -4.05],
);
/** Booth tables down the west wall, a bench each side of each. */
export const BOOTHS: readonly Vec2[] = [
  [-5.6, -1.6],
  [-5.6, 1.6],
];
export const BOOTH_SEATS: readonly { at: Vec2; facing: Vec2 }[] =
  BOOTHS.flatMap(([x, z]) =>
    [-1, 1].map((side) => ({
      at: [x, z + side * 0.85] as Vec2,
      facing: [x, z] as Vec2,
    })),
  );
/** The jukebox in the east corner. */
export const JUKEBOX: Vec2 = [6.3, -5.2];
/** The cook at the counter's pass, where you order. */
export const COOK: Vec2 = [-0.5, -5.9];
/** The servers' loop through the middle of the room. */
export const LOOP = { x: 1.6, z: -0.6, rx: 3, rz: 1.8 } as const;

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
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  ...BOOTHS.map(([x, z]) => box(x - 0.55, z - 0.4, x + 0.55, z + 0.4)),
  box(
    JUKEBOX[0] - 0.45,
    JUKEBOX[1] - 0.35,
    JUKEBOX[0] + 0.45,
    JUKEBOX[1] + 0.35,
  ),
];
