// Concrete Wave: an open-air skatepark behind a gate on Beachside's west
// boulevard. The half-pipe (skate.ts) along the north, a bowl in the west, a
// funbox with rails in the east, bleachers to the south. One layout, shared
// by the room's floor and blockers (rooms.ts), its seats and the client.
import { HALF_WIDTH } from "./skate.ts";
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -14, x1: 14, z0: -9.5, z1: 9 } as const;
/** The half-pipe's middle on the ground, and how deep it runs (z). */
export const PIPE = { x: 0, z: -5.6, depth: 6 } as const;
/** A point in pipe space (x across, y up) on its middle line, in the room. */
export function pipeToRoom(x: number): Vec2 {
  return [PIPE.x + x, PIPE.z];
}
/** Where you stand to drop in: the west deck's ladder. */
export const DROP_IN: Vec2 = [
  PIPE.x - HALF_WIDTH - 1,
  PIPE.z + PIPE.depth / 2 + 0.8,
];
export const BOWL = { x: -9, z: 3, r: 3.2 } as const;
export const FUNBOX = { x0: 6, x1: 11, z0: 0.6, z1: 4.4 } as const;
/** Bleachers along the south, facing the pipe. */
export const BLEACHER_Z = 7.4;
export const BLEACHER_SEATS: readonly Vec2[] = [-2, -1, 0, 1, 2].map(
  (x): Vec2 => [x * 1.2, BLEACHER_Z],
);

export const EXIT: Vec2 = [0, 8.6];
export const SPAWN: Vec2 = [0, 5.6];
export const SKATEPARK_DOOR = {
  position: [-371, 244.4] as const,
  landing: [-371, 247.6] as const,
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
  // the half-pipe and its decks
  box(
    PIPE.x - HALF_WIDTH - 1.2,
    PIPE.z - PIPE.depth / 2,
    PIPE.x + HALF_WIDTH + 1.2,
    PIPE.z + PIPE.depth / 2,
  ),
  Array.from({ length: 10 }, (_, i): Vec2 => {
    const a = (i / 10) * Math.PI * 2;
    return [BOWL.x + Math.sin(a) * BOWL.r, BOWL.z + Math.cos(a) * BOWL.r];
  }),
  box(FUNBOX.x0, FUNBOX.z0, FUNBOX.x1, FUNBOX.z1),
  // the bleachers' back rows
  box(-3.4, BLEACHER_Z + 0.2, 3.4, FLOOR_BOUNDS.z1 - 1.1),
];
