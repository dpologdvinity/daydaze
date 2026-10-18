// Green Haze, the 18+ lounge in the warehouse on Gallery Row's south side:
// low velvet couches round a coffee table, a glass counter where the
// budtender serves joints, edibles and shroom tea, and a wall of plants
// under grow lights. 18+ only: see age.ts. One layout, shared by the room's
// floor and blockers (rooms.ts) and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -7, x1: 7, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const GREEN_HAZE_DOOR = {
  position: [156, -245.5] as const,
  landing: [156, -249.5] as const,
};

/** The glass counter along the back wall, and the budtender behind it. */
export const COUNTER = { x0: -3.5, x1: 3.5, z0: -4.6, z1: -3.8 } as const;
export const BUDTENDER: Vec2 = [0.6, -5.1];

/** Two couch nooks, each an L of couches round a low table. */
export const NOOKS: readonly { table: Vec2; yaw: number }[] = [
  { table: [-4.4, 0.6], yaw: Math.PI / 2 },
  { table: [4.4, 0.6], yaw: -Math.PI / 2 },
];

/** The grow wall down the west side, behind glass. */
export const GROW = { x0: -7, x1: -6.2, z0: -5, z1: -1.6 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(GROW.x0, GROW.z0, GROW.x1, GROW.z1),
  ...NOOKS.map(({ table: [x, z] }) => box(x - 0.6, z - 0.6, x + 0.6, z + 0.6)),
];
