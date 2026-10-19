// The Marquise Rooftop, on top of the hotel on Park Avenue: an infinity
// pool along the edge with the skyline beyond, sun loungers in a row, a hot
// tub, a pool bar and cabanas. Swimwear on. One layout, shared by the
// room's floor and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

/** A regular polygon round `c`, for round footprints. */
function round(c: Vec2, r: number, n = 10): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const a = (i / n) * Math.PI * 2;
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
}

export const BOUNDS = { x0: -10, x1: 10, z0: -8, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const HOTEL_DOOR = {
  position: [430, -266.4] as const,
  landing: [430, -263] as const,
};

/** The infinity pool along the back edge. */
export const POOL = { x0: -7, x1: 4.5, z0: -7.8, z1: -4.6 } as const;
/** The hot tub: its rim's radius, and the seats round inside it. */
export const TUB: Vec2 = [7.4, -5.6];
export const TUB_RIM = 1.2;
const TUB_CORE = 0.7;
export const TUB_SEATS: readonly number[] = [
  Math.PI * 0.5,
  Math.PI,
  Math.PI * 1.5,
];
export const TUB_SEAT_RADIUS = 0.78;
/** Sun loungers in a row along the pool, feet toward the city side. */
export const LOUNGERS: readonly number[] = [-6, -3.6, -1.2, 1.2, 3.6];
export const LOUNGER_Z = -2.95;
export const LOUNGER_HALF = 0.95;
/** The pool bar on the west side, its stools and bartender. */
export const BAR = { x0: -9.6, x1: -8.6, z0: -1.4, z1: 3.4 } as const;
export const STOOL_X = -7.95;
export const STOOL_ZS: readonly number[] = [-0.6, 0.6, 1.8, 3];
export const BARTENDER: Vec2 = [-9.8, 1];
/** Two cabanas on the east side, a daybed under each. */
export const CABANAS: readonly Vec2[] = [
  [8.2, -1],
  [8.2, 2.6],
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(POOL.x0, POOL.z0, POOL.x1, POOL.z1),
  round(TUB, TUB_CORE),
  ...LOUNGERS.map((x) =>
    box(x - 0.35, LOUNGER_Z - LOUNGER_HALF, x + 0.35, LOUNGER_Z + LOUNGER_HALF),
  ),
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
  ...CABANAS.map(([x, z]) => box(x - 0.8, z - 0.9, x + 1.8, z + 0.9)),
];
