// Flip City Gymnastics: a gym on the Fairground forecourt. The blue spring
// floor in the middle (the routine, gymnastics.ts), the balance beam and
// uneven bars down the west, the vault and a trampoline down the east, the
// judges' table at the north.
import type { Vec2 } from "./walk.ts";

export const SPRING = { x: 0, z: -0.6, half: 3.6 } as const;
export const BEAM = { x: -7.6, z0: -4, z1: 2 } as const;
export const BARS = { x: -7.6, z: 5 } as const;
export const VAULT = { x: 7.6, z: -2 } as const;
export const TRAMPOLINE = { x: 7.6, z: 4, r: 1.3 } as const;
export const JUDGES = { x0: -2.4, x1: 2.4, z: -6.6 } as const;
/** Benches along the south wall, facing the floor. */
export const BENCH_Z = 7.2;
export const BENCH_SEATS: readonly Vec2[] = [-3, -2, 2, 3].map((x): Vec2 => [
  x,
  BENCH_Z,
]);
export const FLOOR_BOUNDS = { x0: -10, x1: 10, z0: -6, z1: 8.6 } as const;
export const EXIT: Vec2 = [0, 8.2];
export const SPAWN: Vec2 = [0, 6.4];
export const GYM_DOOR = {
  position: [205, 240.5] as const,
  landing: [205, 243.6] as const,
};
export const GYM_LOT = { x0: 190, x1: 214, z0: 214, z1: 239 } as const;

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
  box(BEAM.x - 0.4, BEAM.z0, BEAM.x + 0.4, BEAM.z1),
  box(BARS.x - 1.2, BARS.z - 0.8, BARS.x + 1.2, BARS.z + 0.8),
  box(VAULT.x - 0.6, VAULT.z - 0.6, VAULT.x + 0.6, VAULT.z + 0.6),
  box(
    TRAMPOLINE.x - TRAMPOLINE.r,
    TRAMPOLINE.z - TRAMPOLINE.r,
    TRAMPOLINE.x + TRAMPOLINE.r,
    TRAMPOLINE.z + TRAMPOLINE.r,
  ),
];
