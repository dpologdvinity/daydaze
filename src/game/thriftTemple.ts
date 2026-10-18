// Thrift Temple on Gallery Row: a vintage store in an old church hall.
// Rails of secondhand clothes down the nave, a dye bar of vintage colors,
// the find of the day on a pedestal under the rose window, fitting rooms
// behind velvet curtains and a clerk at the old pulpit of a counter. One
// layout, shared by the room's floor and blockers (rooms.ts) and the
// client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -8, x1: 8, z0: -8, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const THRIFT_DOOR = {
  position: [-96, -245.5] as const,
  landing: [-96, -249.5] as const,
};

/** Clothes rails down both sides of the nave, end-on to the aisle. */
export const RAILS: readonly { x: number; z: number }[] = [
  -3.6, -0.4, 2.8,
].flatMap((z) => [
  { x: -5, z },
  { x: 5, z },
]);
export const RAIL_LENGTH = 2.4;
/** The find of the day on its pedestal, under the rose window. */
export const PEDESTAL: Vec2 = [0, -6];
/** The counter in the west apse and the clerk behind it. */
export const COUNTER = { x0: -7, x1: -6, z0: -7.6, z1: -5 } as const;
export const CLERK: Vec2 = [-7.5, -6.3];
/** Two fitting rooms in the east apse. */
export const FITTING = { x0: 6, x1: 8, z0: -7.8, z1: -4.6 } as const;

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...RAILS.map(({ x, z }) =>
    box(x - RAIL_LENGTH / 2, z - 0.35, x + RAIL_LENGTH / 2, z + 0.35),
  ),
  box(
    PEDESTAL[0] - 0.7,
    PEDESTAL[1] - 0.7,
    PEDESTAL[0] + 0.7,
    PEDESTAL[1] + 0.7,
  ),
  box(COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1),
  box(FITTING.x0, FITTING.z0, FITTING.x1, FITTING.z1),
];
