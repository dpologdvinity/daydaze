// The Dome: a basketball arena on the Fairground forecourt. One hoop at the
// north end, the shootout's spots round it, stands down both sides and
// behind, the tunnel in from the forecourt at the south end. One layout,
// shared by the room's floor and blockers (rooms.ts) and the client.
import type { Vec2 } from "./walk.ts";

/** The hoop's spot on the floor: court space's origin is under the rim. */
export const HOOP: Vec2 = [0, -4.6];

/** A point in court space (hoops.ts) in the room. */
export function courtToRoom([x, z]: Vec2): Vec2 {
  return [HOOP[0] + x, HOOP[1] + z];
}

export const COURT = { x0: -7.5, x1: 7.5, z0: -6.4, z1: 8.8 } as const;
/** Courtside benches along the east sideline, facing the floor. */
export const BENCH_X = 7.1;
export const BENCH_SEATS: readonly Vec2[] = [2.6, 3.4, 4.2, 5].map(
  (z): Vec2 => [BENCH_X, z],
);

export const EXIT: Vec2 = [0, 8.5];
export const SPAWN: Vec2 = [0, 7.4];
export const DOME_DOOR = {
  position: [290, 240.5] as const,
  landing: [290, 243.6] as const,
};
export const DOME_LOT = { x0: 276, x1: 304, z0: 211, z1: 239 } as const;

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(
  COURT.x0,
  COURT.z0,
  COURT.x1,
  COURT.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // the hoop's stanchion, behind the baseline
  box(HOOP[0] - 0.4, HOOP[1] - 1.8, HOOP[0] + 0.4, HOOP[1] - 1.2),
  // the bench: its back to the stands, seats facing in
  box(BENCH_X + 0.15, 2.1, COURT.x1, 5.5),
];
