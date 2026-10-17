// Sugar Rush: a Y2K pop club on Nightlife Row's south side, two doors east
// of Pulse. One layout, shared by the room's floor and blockers (rooms.ts),
// its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: back wall at z = -6, the street door at the front. */
export const FLOOR_BOUNDS = { x0: -5.6, x1: 5.6, z0: -5.6, z1: 6.2 } as const;

/** The dance floor's centre, in front of the DJ. */
export const DANCE: Vec2 = [0, 0.4];

/** The DJ booth at the back, between two dancers' podiums. */
export const DJ = { x0: -1.1, x1: 1.1, z0: -5.6, z1: -4.5 } as const;
export const PODIUMS: readonly Vec2[] = [
  [-3.4, -4.6],
  [3.4, -4.6],
];
export const PODIUM_RADIUS = 0.7;
export const PODIUM_TOP = 0.5;

/** The bar along the east wall: its front at x = BAR.front. */
export const BAR = { front: 4.8, back: 5.5, z0: -2, z1: 3 } as const;
export const STOOL_X = 4.35;
export const STOOL_ZS: readonly number[] = [-1.3, -0.1, 1.1, 2.3];

/** Inflatable chairs along the west wall, facing the dance floor. */
export const CHAIR_X = -5.2;
export const CHAIR_ZS: readonly number[] = [-1.6, 0.4, 2.4];

/** The street door, and where you step out of it, and in. */
export const EXIT: Vec2 = [0, 5.8];
export const SPAWN: Vec2 = [0, 4.6];
export const SUGAR_RUSH_DOOR = {
  position: [156, 12.5] as const,
  landing: [156, 9] as const,
};

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
  box(DJ.x0, DJ.z0, DJ.x1, DJ.z1),
  ...PODIUMS.map(([x, z]) =>
    box(
      x - PODIUM_RADIUS,
      z - PODIUM_RADIUS,
      x + PODIUM_RADIUS,
      z + PODIUM_RADIUS,
    ),
  ),
  box(BAR.front, BAR.z0, BAR.back, BAR.z1),
  // the chairs, their fronts left clear by a body's width for walking up
  ...CHAIR_ZS.map((z) => box(-5.7, z - 0.4, CHAIR_X + 0.1, z + 0.4)),
];
