// Daydaze Motors on Park Avenue: a glass showroom with every road car on a
// turntable in two rows, an aisle between them and a sales desk by the door.
// One layout, shared by the room's floor and blockers (rooms.ts) and the
// client's scene and panel.
import { STARTER } from "./garage.ts";
import { ROAD_CARS } from "./driving/roster.ts";
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -12, x1: 12, z0: -9, z1: 8 } as const;
export const SPAWN: Vec2 = [0, 6.6];
export const EXIT: Vec2 = [0, 7.6];
export const MOTORS_DOOR = {
  position: [430, -245.5] as const,
  landing: [430, -249.5] as const,
};

/** The cars for sale (all but the starter), each on its turntable: six
 * along the back, the rest along the front, noses towards the aisle. */
export const DISPLAY: readonly { id: string; at: Vec2 }[] = ROAD_CARS.filter(
  (c) => c.id !== STARTER,
).map((c, i) => {
  const back = i < 6;
  const k = back ? i : i - 6;
  const per = back ? 6 : 5;
  return {
    id: c.id,
    at: [(k - (per - 1) / 2) * 3.6, back ? -6 : 1.5],
  };
});

/** A turntable's half size: a long car fits on it. */
export const TABLE: Vec2 = [1.3, 2.8];

export const DESK = { x0: 8.6, z0: 4.4, x1: 11.4, z1: 5.6 } as const;
export const SALES: Vec2 = [10, 3.7];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...DISPLAY.map(({ at: [x, z] }) =>
    box(x - TABLE[0], z - TABLE[1], x + TABLE[0], z + TABLE[1]),
  ),
  box(DESK.x0, DESK.z0, DESK.x1, DESK.z1),
];
