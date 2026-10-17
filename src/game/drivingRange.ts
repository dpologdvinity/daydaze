// Skyline Driving Range: a two-level range of tee bays in the Arts
// District, looking out over a floodlit range of target greens
// (golfRange.ts) to the city skyline.
import type { Vec2 } from "./walk.ts";

/** Tee bays along the front of the range; you hit from the middle one. */
export const BAY_XS: readonly number[] = [-6, -3, 0, 3, 6];
export const TEE_Z = -2;
export const TEE: Vec2 = [0, TEE_Z];
/** A point in range space (golfRange.ts: x across, z downrange) in the
 * room, where downrange is -z. */
export function rangeToRoom([x, z]: Vec2): Vec2 {
  return [TEE[0] + x, TEE[1] - z];
}
export const FLOOR_BOUNDS = { x0: -8.5, x1: 8.5, z0: -1.2, z1: 6 } as const;
/** Benches behind the bays. */
export const BENCH_Z = 2.4;
export const BENCH_SEATS: readonly Vec2[] = [-4.5, -3.5, 3.5, 4.5].map(
  (x): Vec2 => [x, BENCH_Z],
);
export const EXIT: Vec2 = [0, 5.6];
export const SPAWN: Vec2 = [0, 4.4];
export const RANGE_DOOR = {
  position: [184, -266.4] as const,
  landing: [184, -263] as const,
};
export const RANGE_LOT = { x0: 172, x1: 196, z0: -292, z1: -268 } as const;

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
  // the bay dividers between the tee mats
  ...[-4.5, -1.5, 1.5, 4.5].map((x) =>
    box(x - 0.1, FLOOR_BOUNDS.z0, x + 0.1, TEE_Z + 1.6),
  ),
  // the benches: thin, both sides clear
  box(-5.4, BENCH_Z - 0.1, -2.6, BENCH_Z + 0.1),
  box(2.6, BENCH_Z - 0.1, 5.4, BENCH_Z + 0.1),
];
