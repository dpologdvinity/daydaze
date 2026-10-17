// The Karaoke Loft: up a stair off Bassline Alley, a low-lit room with a
// stage, a big lyric screen and booths. One layout, shared by the room's
// floor and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: the stage at the back (z = -5), the door at the front. */
export const FLOOR_BOUNDS = { x0: -5.6, x1: 5.6, z0: -4.6, z1: 5.4 } as const;

/** The stage: a lit platform across the back, almost flush (walkers have
 * no floor heights, so a real step would swallow the singer's feet). */
export const STAGE = {
  x0: -3,
  x1: 3,
  z0: -5.8,
  z1: -3.6,
  height: 0.06,
} as const;

/** Where you stand to sing: the mic stand, centre stage. */
export const MIC: Vec2 = [0, -4.4];

/** Booths along both side walls: a banquette against the wall, its two
 * seats turned to watch the stage, a drinks ledge on the wall above. */
export const BOOTH_ZS: readonly number[] = [-1.2, 2.4];
export const BOOTH_WALL_X = 5.6;
export const BOOTH_SEAT_X = 5.05;

/** Every booth seat: both sides, both booths, two to a banquette. */
export const BOOTH_SEATS: readonly Vec2[] = BOOTH_ZS.flatMap((z) =>
  [-1, 1].flatMap((side) =>
    [-0.45, 0.45].map((dz): Vec2 => [side * BOOTH_SEAT_X, z + dz]),
  ),
);

/** The door from the alley stair, where you step in, and the exit pad. */
export const EXIT: Vec2 = [0, 5];
export const SPAWN: Vec2 = [0, 3.8];
export const KARAOKE_DOOR = {
  position: [128, 66] as const,
  landing: [131, 66] as const,
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

/** Nothing on the floor blocks: the stage is walked onto to sing, and the
 * booths' drinks sit on a ledge on the wall. */
export const BLOCKERS: readonly (readonly Vec2[])[] = [];
