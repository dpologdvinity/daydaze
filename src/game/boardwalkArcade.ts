// The Boardwalk Arcade on Shore Boulevard: carpet with neon confetti, three
// Skee-Ball lanes along the back (the middle one is the player's;
// skeeBall.ts), a claw machine, a row of pinball tables and the prize
// counter by the door. One layout, shared by the room's floor and blockers
// (rooms.ts) and the client's scene.
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
export const ARCADE_DOOR = {
  position: [96, 244.5] as const,
  landing: [96, 247.6] as const,
};

/** The Skee-Ball lanes: their centers along x, from the foul line back. */
export const LANES: readonly number[] = [-2.4, 0, 2.4];
export const LANE = { width: 1.6, z0: -6.8, z1: -1.6 } as const;
/** The claw machine, the pinball row and the prize counter. */
export const CLAW = { x0: -8.6, x1: -7.2, z0: -3, z1: -1.6 } as const;
export const PINBALLS: readonly number[] = [-6.4, -4.8];
export const PINBALL_Z = { z0: 1.4, z1: 2.8 } as const;
export const COUNTER = { x0: 5.6, x1: 8.6, z0: 1.6, z1: 2.6 } as const;
/** The attendant stands behind the counter, the prize shelves behind her. */
export const ATTENDANT: Vec2 = [7.1, 1];
export const SHELVES = { x0: 5.6, x1: 8.6, z0: -0.3, z1: 0.2 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...LANES.map((x) =>
    box(x - LANE.width / 2, LANE.z0, x + LANE.width / 2, LANE.z1),
  ),
  box(CLAW.x0, CLAW.z0, CLAW.x1, CLAW.z1),
  ...PINBALLS.map((x) => box(x - 0.45, PINBALL_Z.z0, x + 0.45, PINBALL_Z.z1)),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(SHELVES.x0, SHELVES.z0, SHELVES.x1, SHELVES.z1),
];
