// The Gridiron: an American football field on the Fairground forecourt, the
// end zone and its yellow goalposts at the north, stands round it; field
// goals are kicked from the hash marks further and further out.
import type { Vec2 } from "./walk.ts";

/** The goal line's middle: field space's origin (fieldGoal.ts). */
export const GOAL: Vec2 = [0, -9];
export function fieldToRoom([x, z]: Vec2): Vec2 {
  return [GOAL[0] + x, GOAL[1] + z];
}
export const FIELD = { x0: -10, x1: 10, z0: -8.6, z1: 9 } as const;
/** The bench along the east sideline, facing the field. */
export const BENCH_X = 9.4;
export const BENCH_SEATS: readonly Vec2[] = [0, 1, 2, 3].map((i): Vec2 => [
  BENCH_X,
  -1 + i,
]);
export const EXIT: Vec2 = [0, 8.6];
export const SPAWN: Vec2 = [0, 7.2];
export const GRIDIRON_DOOR = {
  position: [356, 240.5] as const,
  landing: [356, 243.6] as const,
};
export const GRIDIRON_LOT = { x0: 342, x1: 370, z0: 214, z1: 239 } as const;

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}
export const FLOOR: readonly Vec2[] = box(
  FIELD.x0,
  FIELD.z0,
  FIELD.x1,
  FIELD.z1,
);
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BENCH_X + 0.15, -1.6, FIELD.x1, 2.6),
];
