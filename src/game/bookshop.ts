// Dog-Ear Books on Park Avenue: floor-to-ceiling shelves with a rolling
// ladder, two freestanding stacks, a fireplace with armchairs for reading,
// the counter by the door and Marmalade, the shop cat, asleep on it. One
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

export const BOUNDS = { x0: -8, x1: 8, z0: -7, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const BOOKSHOP_DOOR = {
  position: [351, -266.4] as const,
  landing: [351, -263] as const,
};

/** Shelves' depth against the walls. */
export const WALL_SHELF = 0.45;
/** Two freestanding double-sided stacks down the middle. */
export const STACKS: readonly { x: number; z0: number; z1: number }[] = [
  { x: -1.6, z0: -4.6, z1: -1.4 },
  { x: 2.2, z0: -4.6, z1: -1.4 },
];
export const STACK_HALF = 0.4;
/** The fireplace in the west wall, and two armchairs either side of the
 * hearth facing each other (`dir`: which way along z each one faces). */
export const FIRE = { x0: -8, x1: -7.2, z0: 0.4, z1: 2.6 } as const;
export const ARMCHAIRS: readonly { at: Vec2; dir: 1 | -1 }[] = [
  { at: [-6.2, -0.5], dir: 1 },
  { at: [-6.2, 3.5], dir: -1 },
];
/** The counter by the door, the bookseller behind it, the cat on it. */
export const COUNTER = { x0: 5, x1: 6.2, z0: 1, z1: 3.4 } as const;
export const CLERK: Vec2 = [6.9, 2.2];
export const CAT: Vec2 = [5.6, 2.9];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // the wall shelves: the back wall, and the side walls round the fire
  box(BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z0 + WALL_SHELF),
  box(BOUNDS.x0, BOUNDS.z0, BOUNDS.x0 + WALL_SHELF, FIRE.z0 - 0.4),
  box(BOUNDS.x1 - WALL_SHELF, BOUNDS.z0, BOUNDS.x1, 0),
  ...STACKS.map(({ x, z0, z1 }) => box(x - STACK_HALF, z0, x + STACK_HALF, z1)),
  box(FIRE.x0, FIRE.z0, FIRE.x1, FIRE.z1),
  // each armchair's seat edge sits just in front of its sitter, so they
  // walk up to it from the hearth side
  ...ARMCHAIRS.map(({ at: [x, z], dir }) =>
    dir > 0
      ? box(x - 0.45, z - 0.5, x + 0.45, z + 0.12)
      : box(x - 0.45, z - 0.12, x + 0.45, z + 0.5),
  ),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
];
