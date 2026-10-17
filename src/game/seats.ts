import type { RoomId } from "./rooms.ts";
import { footprint, type Furniture } from "./home/decor.ts";
import { SOFA, STOOL_XS, STOOL_Z } from "./rooftop.ts";
import { CHAIR_X, CHAIR_ZS, STOOL_X, STOOL_ZS } from "./sugarRush.ts";
import * as ARCADE from "./arcadeBar.ts";
import * as LA_NOCHE from "./laNoche.ts";
import * as DOME from "./dome.ts";
import * as STADIUM from "./stadium.ts";
import { BENCH_SEATS as LINKS_BENCH } from "./lagoonLinks.ts";
import { FOUNTAIN, SQUARE_BENCHES } from "./city/layout.ts";
import { BENCH_SEATS } from "./bowlingAlley.ts";
import { BOOTH_SEATS, MIC } from "./karaoke.ts";
import * as WAREHOUSE from "./warehouse.ts";
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

// the food rooms share one fit-out: three cafe tables with a chair each side
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
        0.5,
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

// The Skylark: stools along the bar, and the lounge sofa facing the deck
const skylarkSeats = [
  ...STOOL_XS.map((x, i) =>
    seat(`skylark-stool-${i}`, "rooftop-bar", [x, STOOL_Z], 0.8, [x, -5]),
  ),
  ...SOFA.cushions.map((at, i) =>
    seat(`skylark-sofa-${i}`, "rooftop-bar", at, 0.45, [0, at[1]], "front"),
  ),
];

// Sugar Rush: stools at the bar on the east wall, inflatable chairs facing
// the dance floor along the west
const sugarRushSeats = [
  ...STOOL_ZS.map((z, i) =>
    seat(`sugar-rush-stool-${i}`, "sugar-rush", [STOOL_X, z], 0.8, [5.5, z]),
  ),
  ...CHAIR_ZS.map((z, i) =>
    seat(
      `sugar-rush-chair-${i}`,
      "sugar-rush",
      [CHAIR_X, z],
      0.45,
      [0, z],
      "front",
    ),
  ),
];

// Bassline: stools at the pallet bar, crate benches along the east wall
const warehouseSeats = [
  ...WAREHOUSE.STOOL_ZS.map((z, i) =>
    seat(`warehouse-stool-${i}`, "warehouse", [WAREHOUSE.STOOL_X, z], 0.8, [
      -7,
      z,
    ]),
  ),
  ...WAREHOUSE.BENCH_ZS.map((z, i) =>
    seat(
      `warehouse-bench-${i}`,
      "warehouse",
      [WAREHOUSE.BENCH_X, z],
      0.45,
      [0, z],
      "front",
    ),
  ),
];

// The Karaoke Loft: booth seats along both walls, turned to watch the stage
const karaokeSeats = BOOTH_SEATS.map((at, i) =>
  seat(`karaoke-booth-${i}`, "karaoke", at, 0.45, MIC, "front"),
);

// Glow Bowl: benches behind the approaches, facing the lanes
const bowlingSeats = BENCH_SEATS.map((at, i) =>
  seat(`bowling-bench-${i}`, "bowling", at, 0.45, [at[0], 0]),
);

// Player 2: stools at the bar
const arcadeSeats = ARCADE.STOOL_ZS.map((z, i) =>
  seat(`arcade-stool-${i}`, "arcade-bar", [ARCADE.STOOL_X, z], 0.8, [6, z]),
);

// La Noche: stools at the bar, and chairs at the tables facing the floor
const laNocheSeats = [
  ...LA_NOCHE.STOOL_ZS.map((z, i) =>
    seat(`la-noche-stool-${i}`, "la-noche", [LA_NOCHE.STOOL_X, z], 0.8, [6, z]),
  ),
  ...LA_NOCHE.TABLE_SEATS.map((at, i) =>
    seat(`la-noche-chair-${i}`, "la-noche", at, 0.45, LA_NOCHE.DANCE, "front"),
  ),
];

// Downtown Plaza: benches round the fountain, two to a bench, facing it
const squareSeats = SQUARE_BENCHES.flatMap(({ at: [x, z], yaw }, b) =>
  [-0.5, 0.5].map((along, i) => {
    // along the bench: perpendicular to the way it faces
    const at: Vec2 = [x + Math.cos(yaw) * along, z - Math.sin(yaw) * along];
    return seat(
      `square-bench-${b}-${i}`,
      "city",
      at,
      0.45,
      [FOUNTAIN.x, FOUNTAIN.z],
      "front",
    );
  }),
);

// Lagoon Links: the bench on the concourse, facing the course
const linksSeats = LINKS_BENCH.map((at, i) =>
  seat(`mini-golf-bench-${i}`, "mini-golf", at, 0.45, [at[0], 0], "front"),
);

// The Dome's courtside bench and the Stadium's dugout, facing the play
const sportsSeats = [
  ...DOME.BENCH_SEATS.map((at, i) =>
    seat(`dome-bench-${i}`, "dome", at, 0.45, [0, at[1]], "front"),
  ),
  ...STADIUM.DUGOUT_SEATS.map((at, i) =>
    seat(`stadium-dugout-${i}`, "stadium", at, 0.45, [0, at[1]], "front"),
  ),
];

export const SEATS: readonly Seat[] = [
  ...foodSeats,
  ...velvetStools,
  ...pulseBanquettes,
  ...skylarkSeats,
  ...sugarRushSeats,
  ...warehouseSeats,
  ...karaokeSeats,
  ...bowlingSeats,
  ...arcadeSeats,
  ...laNocheSeats,
  ...squareSeats,
  ...linksSeats,
  ...sportsSeats,
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
