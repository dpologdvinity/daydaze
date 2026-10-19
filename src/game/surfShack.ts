// Swell Surf Co. on Shore Boulevard: the shack's deck and a strip of sand
// out back, then the break, where the player paddles out and rides a wave
// (surf.ts). One layout, shared by the room's floor and blockers
// (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

/** The sand and deck you can walk; the water starts north of it. */
export const BOUNDS = { x0: -10, x1: 10, z0: -3, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const SURF_DOOR = {
  position: [-152, 244.5] as const,
  landing: [-152, 247.6] as const,
};

/** The shack on the east side, the board rack and the rental counter. */
export const SHACK = { x0: 4.5, x1: 10, z0: 1.5, z1: 7 } as const;
export const RACK = { x0: -9.6, x1: -6.4, z0: 3.6, z1: 4.4 } as const;
export const RENTER: Vec2 = [5, 3];
/** Two beach chairs on the sand, facing the water. */
export const CHAIRS: readonly Vec2[] = [
  [-4.5, -0.6],
  [-2.8, -0.6],
];
/** Where the wave breaks, and meters of face per unit of surf.ts reach. */
export const BREAK_Z = -16;
export const FACE_SCALE = 1.8;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(SHACK.x0, SHACK.z0, SHACK.x1, SHACK.z1),
  box(RACK.x0, RACK.z0, RACK.x1, RACK.z1),
  // each chair's seat edge sits just in front of its sitter, toward the sea
  ...CHAIRS.map(([x, z]) => box(x - 0.35, z - 0.12, x + 0.35, z + 0.6)),
];
