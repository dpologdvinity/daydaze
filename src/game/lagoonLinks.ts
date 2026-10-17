// Lagoon Links: a mini golf course on Beachside's sand, through the gate on
// Shore Boulevard. Three holes side by side, tees towards the gate; a
// concourse along the front with a bench and the starter's hut. One layout,
// shared by the room's floor and blockers (rooms.ts), its seats and the
// client's scene.
import { HOLES, type Vec2 } from "./minigolf.ts";

/** Where each hole's origin (its tee) sits in the room: x, and z for all. */
export const HOLE_XS: readonly number[] = [-7, -1.5, 5.5];
export const TEE_Z = 3.5;

/** A point on hole `i` (hole space) in the room. */
export function holeToRoom(i: number, [x, z]: Vec2): Vec2 {
  return [HOLE_XS[i] + x, TEE_Z + z];
}

export const FLOOR_BOUNDS = { x0: -10, x1: 9, z0: -7, z1: 9 } as const;

/** A bench on the concourse facing the course, two seats. */
export const BENCH: Vec2 = [-6, 6.8];
export const BENCH_SEATS: readonly Vec2[] = [
  [BENCH[0] - 0.5, BENCH[1]],
  [BENCH[0] + 0.5, BENCH[1]],
];
/** The starter's hut, where you pick up a putter. */
export const HUT = { x0: 5, x1: 8, z0: 6.2, z1: 8.6 } as const;

export const EXIT: Vec2 = [0, 8.6];
export const SPAWN: Vec2 = [0, 7.4];
export const LINKS_DOOR = {
  position: [-128, 244.4] as const,
  landing: [-128, 247.6] as const,
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

/** Each green, as boxes round its walls (the dogleg's two legs separately),
 * a little wide for the curbs; the bench's back; the hut. */
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...HOLES.flatMap((hole, i) => {
    const legs: Vec2[][] =
      hole.walls.length === 4
        ? [hole.walls.slice()]
        : [box(-0.75, -6, 0.75, 0.6), box(0.75, -6, 3.4, -4.4)];
    return legs.map((leg) => {
      const xs = leg.map(([x]) => x);
      const zs = leg.map(([, z]) => z);
      const [x0, z0] = holeToRoom(i, [Math.min(...xs), Math.min(...zs)]);
      const [x1, z1] = holeToRoom(i, [Math.max(...xs), Math.max(...zs)]);
      return box(x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1);
    });
  }),
  box(BENCH[0] - 0.9, BENCH[1] + 0.15, BENCH[0] + 0.9, BENCH[1] + 0.35),
  box(HUT.x0, HUT.z0, HUT.x1, HUT.z1),
];
