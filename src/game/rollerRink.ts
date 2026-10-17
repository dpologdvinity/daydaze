// The Starlite Roller Disco: a roller rink on Beachside's west end. An oval
// of maple floor inside a low rail (with gaps to skate on and off), the
// rental counter and benches outside it, the DJ booth at the north end.
// One layout, shared by the room's floor (rooms.ts), its seats and the
// client's scene.
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -11, x1: 11, z0: -8, z1: 7.6 } as const;
/** The rink: an ellipse inside the rail. */
export const RINK = { x: 0, z: -0.6, rx: 8.4, rz: 5 } as const;
/** The rental counter on the west wall, its clerk in front. */
export const COUNTER = { x0: -11, x1: -10, z0: 3, z1: 6.6 } as const;
export const RENTAL: Vec2 = [-9.4, 4.8];
/** Benches along the south wall, facing the rink. */
export const BENCH_Z = 6.8;
export const BENCH_SEATS: readonly Vec2[] = [3, 4, 6, 7].map((x): Vec2 => [
  x,
  BENCH_Z,
]);
export const DJ: Vec2 = [0, -7.2];

export const EXIT: Vec2 = [-2, 7.2];
export const SPAWN: Vec2 = [-2, 6.1];
export const RINK_DOOR = {
  position: [-422, 244.4] as const,
  landing: [-422, 247.6] as const,
};
export const RINK_LOT = { x0: -440, x1: -404, z0: 206, z1: 243 } as const;
/** The skatepark's gate next door, on the same stretch of boulevard. */
export const SKATEPARK_LOT = { x0: -398, x1: -344, z0: 206, z1: 243 } as const;

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
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(DJ[0] - 1.2, FLOOR_BOUNDS.z0, DJ[0] + 1.2, DJ[1] + 0.5),
];
