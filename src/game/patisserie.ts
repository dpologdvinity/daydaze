// Sucre, the patisserie on Park Avenue: a pink and mint salon de the. A
// long glass case of cakes and macarons, a marble stand where the player
// builds a macaron tower (macaronTower.ts), cafe tables under a crystal
// chandelier and Colette behind the case. One layout, shared by the room's
// floor and blockers (rooms.ts), its seats and the client's scene.
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
export const PATISSERIE_DOOR = {
  position: [262, -244.6] as const,
  landing: [262, -248.6] as const,
};

/** The pastry case along the back, and Colette behind it. */
export const CASE = { x0: -4.5, x1: 4.5, z0: -4.4, z1: -3.6 } as const;
export const BAKER: Vec2 = [1.5, -5.1];
/** The marble stand the macaron tower goes up on. */
export const STAND: Vec2 = [-4.6, 0.2];
/** Cafe tables, two chairs each. */
export const TABLES: readonly Vec2[] = [
  [1.2, 0.6],
  [4.4, 0.6],
  [2.8, 3.2],
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(CASE.x0, CASE.z0, CASE.x1, CASE.z1),
  box(CASE.x0, -6, CASE.x1, -5.6),
  box(STAND[0] - 0.5, STAND[1] - 0.5, STAND[0] + 0.5, STAND[1] + 0.5),
  ...TABLES.map(([x, z]) => box(x - 0.4, z - 0.4, x + 0.4, z + 0.4)),
];
