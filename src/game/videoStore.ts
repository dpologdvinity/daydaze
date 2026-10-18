// Rewind Video on Maple Drive in Suburbia: a '90s rental store of tape
// shelves, a new-releases wall, a TV playing at the counter, a popcorn
// machine and the return slot. Throwback Trivia waits at the counter. One
// layout, shared by the room's floor and blockers (rooms.ts), its hotspot
// and the client's scene.
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
export const REWIND_DOOR = {
  position: [-216, -265.2] as const,
  landing: [-216, -262.5] as const,
};

/** Tape shelves, double-sided, running north-south. */
export const SHELVES: readonly { x: number; z0: number; z1: number }[] = [
  { x: -5, z0: -4.4, z1: 1.4 },
  { x: -2, z0: -4.4, z1: 1.4 },
  { x: 1, z0: -4.4, z1: 1.4 },
];
export const COUNTER = { x0: 3.8, x1: 7.2, z0: -0.4, z1: 0.6 } as const;
export const CLERK: Vec2 = [5.5, -0.9];
/** Where you stand to play Throwback Trivia at the counter. */
export const TRIVIA_SPOT: Vec2 = [5.5, 1.5];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...SHELVES.map((s) => box(s.x - 0.45, s.z0, s.x + 0.45, s.z1)),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
];
