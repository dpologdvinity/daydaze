// Gallery 44 on Gallery Row: a white-cube gallery. Six pieces round the
// walls, two sculptures on plinths, a long bench down the middle, and an
// easel by the open wall where the player paints a piece of their own and
// hangs it (painting.ts). One layout, shared by the room's floor and
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
export const GALLERY_DOOR = {
  position: [36, -245.5] as const,
  landing: [36, -249.5] as const,
};

/** The bench down the middle, sat on from either side. */
export const BENCH = { x0: -1.4, x1: 1.4, z0: -0.25, z1: 0.25 } as const;
/** Sculptures on plinths. */
export const PLINTHS: readonly Vec2[] = [
  [-5, -1.5],
  [5, -1.5],
];
/** The easel, and where on the back wall the player's painting hangs. */
export const EASEL: Vec2 = [-2.2, -4.7];
export const OPEN_WALL = { x: 1.2, y: 2.4, size: 1.8 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BENCH.x0, BENCH.z0, BENCH.x1, BENCH.z1),
  ...PLINTHS.map(([x, z]) => box(x - 0.4, z - 0.4, x + 0.4, z + 0.4)),
  box(EASEL[0] - 0.4, EASEL[1] - 0.3, EASEL[0] + 0.4, EASEL[1] + 0.3),
];
