// The Courtside Club, on Park Avenue in Uptown: one floodlit hard court
// under a glass roof, the net across the middle (z = 0), you at the south
// baseline and the club pro at the north. One layout, shared by the room's
// floor and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The court's lines: singles sidelines and the baselines. */
export const COURT = { half: 4.1, doubles: 5.5, baseline: 11.9 } as const;
/** Where you stand to play, and where the pro does. */
export const YOU: Vec2 = [0, COURT.baseline + 0.6];
export const PRO: Vec2 = [0, -COURT.baseline - 0.6];
/** The floor round the court. */
export const FLOOR_BOUNDS = { x0: -9, x1: 9, z0: -15, z1: 16.5 } as const;
/** Courtside benches along the east side, facing the court. */
export const BENCH_X = 7.8;
export const BENCH_SEATS: readonly Vec2[] = [4, 5, 7, 8].map((z): Vec2 => [
  BENCH_X,
  z,
]);

export const SPAWN: Vec2 = [0, 15];
export const EXIT: Vec2 = [0, 16];
export const COURTSIDE_DOOR = {
  position: [374, -266.4] as const,
  landing: [374, -263] as const,
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
/** The net, post to post: walk round it, not through it. */
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(-COURT.doubles - 0.4, -0.15, COURT.doubles + 0.4, 0.15),
];
