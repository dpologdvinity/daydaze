// The Back Room, Nightlife Row's speakeasy: behind an unmarked door, a
// low-lit cocktail bar of leather booths, a long bar with a mirrored back
// wall, a piano in the corner and a bartender who knows her bitters. One
// layout, shared by the room's floor and blockers (rooms.ts), its seats and
// the client's scene.
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
export const BACK_ROOM_DOOR = {
  position: [151, -12.5] as const,
  landing: [151, -9] as const,
};

/** The bar along the back wall, and its stools' line. */
export const BAR = { x0: -5, x1: 3, z0: -5.2, z1: -4.4 } as const;
export const STOOL_Z = -3.7;
export const STOOL_XS: readonly number[] = [-4.2, -2.8, -1.4, 0, 1.4, 2.6];
export const BARTENDER: Vec2 = [-1, -5.6];
/** Two leather booths down the east wall, each round a table. */
export const BOOTHS: readonly { table: Vec2 }[] = [
  { table: [6.4, -2.4] },
  { table: [6.4, 1.6] },
];
/** The piano in the west corner. */
export const PIANO = { x0: -7.8, x1: -6.2, z0: -1, z1: 1.2 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
  box(PIANO.x0, PIANO.z0, PIANO.x1, PIANO.z1),
  ...BOOTHS.map(({ table: [x, z] }) => box(x - 0.6, z - 0.5, x + 1.6, z + 0.5)),
];
