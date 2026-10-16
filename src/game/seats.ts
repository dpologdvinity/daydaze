import type { RoomId } from "./rooms.ts";
import { yawTowards, type Vec2 } from "./walk.ts";

/**
 * Chairs, stools and sofas a player can sit on. Tapping one walks the player
 * to `approach` (on the floor, in front of the seat), then seats them at
 * `at` facing `yaw`. `height` is the top of the seat cushion in metres.
 */
export type Seat = {
  id: string;
  room: RoomId;
  at: Vec2;
  height: number;
  yaw: number;
  approach: Vec2;
};

/** Where to stand to sit down: half a metre out from the seat, facing away. */
function seat(
  id: string,
  room: RoomId,
  at: Vec2,
  height: number,
  facing: Vec2,
): Seat {
  const yaw = yawTowards(at, facing);
  return {
    id,
    room,
    at,
    height,
    yaw,
    approach: [at[0] - Math.sin(yaw) * 0.5, at[1] - Math.cos(yaw) * 0.5],
  };
}

// the food rooms share one fit-out: three cafe tables with a stool each side
const FOOD_TABLES: Vec2[] = [
  [-2.5, 3.4],
  [0, 4.3],
  [2.5, 3.4],
];
const FOOD_ROOMS: RoomId[] = ["filipino-joint", "boba-matcha", "ube-bakery"];

const foodSeats = FOOD_ROOMS.flatMap((room) =>
  FOOD_TABLES.flatMap(([x, z], t) =>
    [-1, 1].map((side) =>
      seat(
        `${room}-table${t}-${side < 0 ? "l" : "r"}`,
        room,
        [x + side * 0.75, z],
        0.62,
        [x, z],
      ),
    ),
  ),
);

// Velvet Room bar stools face the bar
const velvetStools = [-3.2, -2.3, -0.5, 0.5, 1.4].map((x, i) =>
  seat(`velvet-stool-${i}`, "velvet-room", [x, -4.05], 0.8, [x, -5]),
);

export const SEATS: readonly Seat[] = [...foodSeats, ...velvetStools];

export function seatsIn(room: RoomId): readonly Seat[] {
  return SEATS.filter((s) => s.room === room);
}
