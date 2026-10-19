// The Starlite Drive-In in Suburbia: a lot at night, classic cars parked in
// rows facing a giant screen, a chrome walk-up diner window, picnic tables
// and a carhop on skates. One layout, shared by the room's floor and
// blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -11, x1: 11, z0: -8, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const DRIVE_IN_DOOR = {
  position: [-210, -247.4] as const,
  landing: [-210, -251] as const,
};

/** The screen, standing beyond the lot's back fence. */
export const SCREEN = { width: 16, height: 8, base: 2.4, z: -12 } as const;
/** Parked cars: their centers, all facing the screen. */
export const CARS: readonly { at: Vec2; id: string; color: string }[] = [
  { at: [-6.5, -4.2], id: "vespera-gt", color: "#ff2f9a" },
  { at: [-2, -4.2], id: "strada-v8", color: "#3fe0d0" },
  { at: [2.6, -4.2], id: "halden-7", color: "#ffd84f" },
  { at: [7, -4.2], id: "nova-spyder", color: "#9b5cff" },
];
export const CAR_HALF = { x: 1, z: 2.2 } as const;
/** The diner's walk-up window on the east side, the carhop out front. */
export const DINER = { x0: 7.5, x1: 11, z0: 0.5, z1: 7 } as const;
export const CARHOP: Vec2 = [6.6, 2.4];
/** Picnic tables on the west side, a bench each side. */
export const TABLES: readonly Vec2[] = [
  [-8, 1.2],
  [-8, 4.4],
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...CARS.map(({ at: [x, z] }) =>
    box(x - CAR_HALF.x, z - CAR_HALF.z, x + CAR_HALF.x, z + CAR_HALF.z),
  ),
  box(DINER.x0, DINER.z0, DINER.x1, DINER.z1),
  // each table, with its benches' seat edges just in front of the sitters
  ...TABLES.map(([x, z]) => box(x - 1, z - 0.42, x + 1, z + 0.42)),
];
