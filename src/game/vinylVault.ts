// Vinyl Vault on Gallery Row: a record shop of crates down the middle,
// album covers framed up the walls, a listening booth and the counter with
// two turntables. One layout, shared by the room's floor and blockers
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

export const BOUNDS = { x0: -8, x1: 8, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
export const VAULT_DOOR = {
  position: [-170, -245.5] as const,
  landing: [-170, -249.5] as const,
};

/** Crate tables: x center, z from z0 to z1, 1 m wide. */
export const CRATES: readonly { x: number; z0: number; z1: number }[] = [
  { x: -4.5, z0: -3.5, z1: 1.5 },
  { x: -1.5, z0: -3.5, z1: 1.5 },
  { x: 1.5, z0: -3.5, z1: 1.5 },
];
export const COUNTER = { x0: 4.2, x1: 7.4, z0: -1.2, z1: 0 } as const;
export const CLERK: Vec2 = [5.8, -1.9];
/** The listening booth in the back corner. */
export const BOOTH = { x0: 5, x1: 8, z0: -6, z1: -3.6 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...CRATES.map((c) => box(c.x - 0.5, c.z0, c.x + 0.5, c.z1)),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(BOOTH.x0, BOOTH.z0, BOOTH.x1, BOOTH.z1),
];
