// The Midnight Horn, Uptown's jazz club on Park Avenue: a low stage for a
// four-piece band under a spotlight, candlelit two-top tables on the floor
// and a bar down the east wall. One layout, shared by the room's floor and
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

export const BOUNDS = { x0: -9, x1: 9, z0: -7, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const HORN_DOOR = {
  position: [402, -266.4] as const,
  landing: [402, -263] as const,
};

/** The stage along the back wall, raised. */
export const STAGE = { x0: -5, x1: 5, z0: -7, z1: -4, height: 0.45 } as const;
/** Where the band plays: piano, upright bass, drums and the horn. */
export const BAND: readonly {
  at: Vec2;
  part: "piano" | "bass" | "drums" | "horn";
}[] = [
  { at: [-3.4, -5.6], part: "piano" },
  { at: [-1.2, -5.8], part: "bass" },
  { at: [1.2, -6.1], part: "drums" },
  { at: [3.3, -5.2], part: "horn" },
];

/** Round two-top tables on the floor. */
export const TABLES: readonly Vec2[] = [
  [-6, -1.5],
  [-3, -1],
  [0, -1.6],
  [3, -1],
  [-4.6, 1.8],
  [-1.5, 2.2],
  [1.6, 2],
];
export const TABLE_R = 0.45;

/** The bar along the east wall, and its stools' line. */
export const BAR = { x0: 7.6, x1: 8.6, z0: -3.5, z1: 3.5 } as const;
export const STOOL_X = 7;
export const STOOL_ZS: readonly number[] = [-2.6, -1.3, 0, 1.3, 2.6];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(STAGE.x0, STAGE.z0, STAGE.x1, STAGE.z1),
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
  ...TABLES.map(([x, z]) =>
    box(x - TABLE_R, z - TABLE_R, x + TABLE_R, z + TABLE_R),
  ),
];
