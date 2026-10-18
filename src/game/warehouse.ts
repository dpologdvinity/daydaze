// Bassline: a techno warehouse behind Sugar Rush, its door on the alley
// that runs back from the avenue between the club blocks. One layout,
// shared by the room's floor and blockers (rooms.ts), its seats, its
// minigame spot and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: the container stage at the back (z = -6.5), the
 * alley door at the front. */
export const FLOOR_BOUNDS = { x0: -7.4, x1: 7.4, z0: -4.6, z1: 6.4 } as const;

/** The DJ plays from inside a shipping container at the back wall. */
export const CONTAINER = {
  x0: -3,
  x1: 3,
  z0: -7,
  z1: -4.6,
  height: 2.6,
} as const;

/** The dance floor's center, under the trusses. */
export const DANCE: Vec2 = [0, -0.6];

/** The bar along the west wall, built from pallets: its front at x = front. */
export const BAR = { front: -6.3, back: -7.4, z0: -1.5, z1: 3.5 } as const;

/** Stools at the bar, facing it. */
export const STOOL_X = -5.85;
export const STOOL_ZS: readonly number[] = [-0.6, 0.8, 2.2];

/** Crate benches along the east wall, seats facing the dance floor. */
export const BENCH_X = 6.9;
export const BENCH_ZS: readonly number[] = [-1.8, -0.8, 2.2, 3.2];

/** In front of the container, where Bassline is played on the decks. */
export const DECKS_SPOT: Vec2 = [2.2, -3.8];

/** The alley door, where you step in, and the exit pad. */
export const EXIT: Vec2 = [0, 6];
export const SPAWN: Vec2 = [0, 4.8];
export const WAREHOUSE_DOOR = {
  position: [134.2, 60] as const,
  landing: [130.5, 60] as const,
};

/** The alley between the club blocks, from the avenue's south sidewalk. */
export const ALLEY = { x0: 127, x1: 135, z0: 14, z1: 92 } as const;

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
  box(BAR.back, BAR.z0, BAR.front, BAR.z1),
  // the crate benches, their fronts left clear by a body's width
  box(BENCH_X + 0.1, -2.4, 7.4, -0.2),
  box(BENCH_X + 0.1, 1.6, 7.4, 3.8),
];
