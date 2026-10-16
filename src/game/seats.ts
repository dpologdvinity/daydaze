import type { RoomId } from "./rooms.ts";
import { footprint, type Furniture } from "./home/decor.ts";
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
  /** A bed: she lies back on it instead of sitting. */
  lie?: true;
};

/** A seat at `at` facing `facing`. `from` is the open side you walk up from:
 * behind a stool at a bar or table, in front of a sofa against a wall. */
function seat(
  id: string,
  room: RoomId,
  at: Vec2,
  height: number,
  facing: Vec2,
  from: "behind" | "front" = "behind",
): Seat {
  const yaw = yawTowards(at, facing);
  const out = from === "front" ? 0.5 : -0.5;
  return {
    id,
    room,
    at,
    height,
    yaw,
    approach: [at[0] + Math.sin(yaw) * out, at[1] + Math.cos(yaw) * out],
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

// Pulse: two banquettes along the right wall (seat front at x = 5.85), facing into the club
const pulseBanquettes = [-2.4, 1.8].flatMap((z, b) =>
  [-0.6, 0.6].map((dz, i) =>
    seat(
      `pulse-banquette-${b}-${i}`,
      "pulse",
      [5.85, z + dz],
      0.6,
      [0, z + dz],
      "front",
    ),
  ),
);

export const SEATS: readonly Seat[] = [
  ...foodSeats,
  ...velvetStools,
  ...pulseBanquettes,
];

export function seatsIn(room: RoomId): readonly Seat[] {
  return SEATS.filter((s) => s.room === room);
}

/** Where the apartment's grid starts on the floor (matches Apartment.tsx). */
export const HOME_ORIGIN: Vec2 = [-4, -3];

/**
 * Seats on the apartment's sofas, wherever decorating put them: two places
 * along each sofa, facing out from its back (rotation 0 faces +z).
 */
const FACINGS: readonly Vec2[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

export function homeSeats(furniture: readonly Furniture[]): Seat[] {
  const out: Seat[] = [];
  furniture.forEach((item, n) => {
    if (item.id !== "sofa" && item.id !== "bed") return;
    const size = footprint(item.id, item.rotation);
    const cx = HOME_ORIGIN[0] + item.cell[0] + size.w / 2;
    const cz = HOME_ORIGIN[1] + item.cell[1] + size.d / 2;
    const facing = FACINGS[item.rotation];
    const along: Vec2 = [facing[1], -facing[0]];
    if (item.id === "bed") {
      // lie down the middle, head to the headboard, feet toward the facing
      // side; walk up from whichever long side is nearer the room's middle
      const half = Math.min(size.w, size.d) / 2 + 0.35;
      const side = along[0] * cx + along[1] * cz > 0 ? -1 : 1;
      out.push({
        id: `home-bed-${n}`,
        room: "apartment",
        at: [cx, cz],
        height: 0.6,
        yaw: yawTowards([cx, cz], [cx + facing[0], cz + facing[1]]),
        approach: [cx + along[0] * half * side, cz + along[1] * half * side],
        lie: true,
      });
      return;
    }
    for (const k of [-0.6, 0.6]) {
      const at: Vec2 = [cx + along[0] * k, cz + along[1] * k];
      out.push(
        seat(
          `home-sofa-${n}-${k < 0 ? "l" : "r"}`,
          "apartment",
          at,
          0.5,
          [at[0] + facing[0], at[1] + facing[1]],
          "front",
        ),
      );
    }
  });
  return out;
}
