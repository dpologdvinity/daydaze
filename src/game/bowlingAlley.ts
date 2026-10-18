// Glow Bowl: a cosmic bowling alley at the back of Suburbia's strip mall.
// Four lanes run away from the concourse (towards -z); you bowl on one of
// them. One layout, shared by the room's floor and blockers (rooms.ts), its
// seats and the client's scene.
import { HEADPIN_Z, PIT_Z } from "./bowling.ts";
import type { Vec2 } from "./walk.ts";

/** Lane centers across the room; PLAY_LANE is the one you bowl on. */
export const LANE_XS: readonly number[] = [-3.3, -1.1, 1.1, 3.3];
export const PLAY_LANE = 2;
/** The foul line, where the lanes meet the concourse. */
export const FOUL_Z = 2;
export const PINS_Z = FOUL_Z - HEADPIN_Z;
export const PIT_END_Z = FOUL_Z - PIT_Z;

/** A point in lane space ([x across, z down the lane]) in the room. */
export function laneToRoom(lane: number, [x, z]: Vec2): Vec2 {
  return [LANE_XS[lane] + x, FOUL_Z - z];
}

/** The concourse you walk on: from the approaches back to the shoe counter. */
export const FLOOR_BOUNDS = { x0: -5.8, x1: 5.8, z0: 2.4, z1: 10 } as const;

/** Backless benches behind the approaches, two seats each: you step over
 * from the concourse and sit facing the lanes. */
export const BENCH_Z = 5.2;
export const BENCH_XS: readonly number[] = [-2.2, 2.2];
export const BENCH_SEATS: readonly Vec2[] = BENCH_XS.flatMap((x) =>
  [-0.45, 0.45].map((dx): Vec2 => [x + dx, BENCH_Z]),
);

/** The shoe counter by the door. */
export const COUNTER = { x0: 3.6, x1: 5.8, z0: 7.6, z1: 8.4 } as const;

export const EXIT: Vec2 = [-4.6, 9.6];
export const SPAWN: Vec2 = [-4.6, 8.4];
export const BOWLING_DOOR = {
  position: [-282, -247.5] as const,
  landing: [-282, -251.5] as const,
};

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
  // the benches: thin, so both sides stay a body's width clear to walk
  ...BENCH_XS.map((x) => box(x - 0.9, BENCH_Z - 0.1, x + 0.9, BENCH_Z + 0.1)),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
];
