// The food venues as storefronts in the city. Each venue gets one building on
// a sidewalk row beside a north-south street: in its own neighbourhood when
// that neighbourhood is built, else on Downtown's rows, in data order. A
// venue with an interior room gets a street door on its row's sidewalk.
import type { Building } from "../city/layout.ts";
import type { RoomId } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";
import { INTERIOR_SPAWN } from "./interiors.ts";
import { FOOD_VENUES } from "./venues.ts";
import { NEIGHBORHOOD_IDS, type NeighborhoodId } from "../dialogue/types.ts";
import type { Neighborhood } from "../city/layout.ts";

function isNeighborhoodId(value: string): value is NeighborhoodId {
  return NEIGHBORHOOD_IDS.some((n) => n === value);
}

/** The city neighbourhood a storefront stands in: its own when built. */
function cityHood(hood: NeighborhoodId): Neighborhood {
  switch (hood) {
    case "little-manila":
    case "chinatown-koreatown":
    case "arts-district":
    case "beachside":
    case "uptown":
    case "suburbia":
    case "fairground":
    case "nightlife-row":
      return hood;
    default:
      return "downtown";
  }
}

/** `street`: the side the row's street is on, where its doors stand. */
type Row = {
  x0: number;
  x1: number;
  z0: number;
  count: number;
  street: "west" | "east";
};

// Rows sit beside the cross streets. Their sidewalks run 4 m beyond the kerb,
// and every storefront stops short of them.
const STEP = 6.5;
const DEPTH = 6;
// Downtown's rows, for its own venues and those of neighbourhoods not yet
// built (they move out as each one lands)
const DOWNTOWN_ROWS: readonly Row[] = [
  // east of b-south
  { x0: 74, x1: 81, z0: 96, count: 13, street: "west" },
  // west of b-south
  { x0: 47, x1: 54, z0: 96, count: 13, street: "east" },
  // west of a-south
  { x0: -81, x1: -74, z0: 100, count: 13, street: "east" },
  // east of a-south
  { x0: -54, x1: -47, z0: 124, count: 9, street: "west" },
  // b-north, both sides
  { x0: 47, x1: 54, z0: -188, count: 13, street: "east" },
  { x0: 74, x1: 81, z0: -188, count: 13, street: "west" },
  // a-north, both sides
  { x0: -81, x1: -74, z0: -188, count: 13, street: "east" },
  { x0: -54, x1: -47, z0: -188, count: 13, street: "west" },
];

// The built neighbourhoods' rows, beside their cross streets and clear of the
// buildings on their main streets (see layout.ts)
const HOOD_ROWS: Partial<Record<NeighborhoodId, readonly Row[]>> = {
  // either side of Little Manila's street (x -320), south of the avenue
  "little-manila": [
    { x0: -310, x1: -303, z0: 46, count: 20, street: "west" },
    { x0: -337, x1: -330, z0: 46, count: 20, street: "east" },
  ],
  // either side of the Chinatown and Koreatown street (x 320)
  "chinatown-koreatown": [
    { x0: 330, x1: 337, z0: 46, count: 20, street: "west" },
    { x0: 303, x1: 310, z0: 46, count: 20, street: "east" },
  ],
  // the cross streets between the avenue's edge and Gallery Row
  "arts-district": [
    { x0: 74, x1: 81, z0: -242, count: 7, street: "west" },
    { x0: -81, x1: -74, z0: -242, count: 7, street: "east" },
  ],
  // either side of Little Manila's street's run north to Maple Drive
  suburbia: [
    { x0: -310, x1: -303, z0: -242, count: 7, street: "west" },
    { x0: -337, x1: -330, z0: -242, count: 7, street: "east" },
  ],
  // either side of the Chinatown street's run north to Park Avenue
  uptown: [
    { x0: 330, x1: 337, z0: -242, count: 7, street: "west" },
    { x0: 303, x1: 310, z0: -242, count: 7, street: "east" },
  ],
  // beside the Chinatown street's run south, behind the Fairground forecourt
  fairground: [
    { x0: 330, x1: 337, z0: 196, count: 6, street: "west" },
    { x0: 303, x1: 310, z0: 196, count: 6, street: "east" },
  ],
  // the cross streets between the old city edge and Shore Boulevard
  beachside: [
    { x0: 74, x1: 81, z0: 196, count: 7, street: "west" },
    { x0: -81, x1: -74, z0: 196, count: 7, street: "east" },
  ],
};

/** Street doors stand on the row's sidewalk, 1.5 m off its front; the doll
 * lands 4 m off it, past the 2 m door trigger, so leaving never re-enters. */
function doorOf(row: Row, z: number): { door: Vec2; landing: Vec2 } {
  const front = row.street === "west" ? row.x0 : row.x1;
  const out = row.street === "west" ? -1 : 1;
  return { door: [front + out * 1.5, z], landing: [front + out * 4, z] };
}
const NEON = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff", "#ff8a3d"];

function rect(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

type Slot = { x0: number; x1: number; z: number; row: Row };

function slotsOf(rows: readonly Row[]): Slot[] {
  return rows.flatMap((row) =>
    Array.from({ length: row.count }, (_, i) => ({
      x0: row.x0,
      x1: row.x1,
      z: row.z0 + STEP * i,
      row,
    })),
  );
}

/** Each venue's slot, in data order: its own neighbourhood's next free slot,
 * else Downtown's. */
const SLOTS: readonly Slot[] = (() => {
  const pools = new Map<NeighborhoodId | "downtown-pool", Slot[]>();
  pools.set("downtown-pool", slotsOf(DOWNTOWN_ROWS));
  for (const [hood, rows] of Object.entries(HOOD_ROWS))
    if (isNeighborhoodId(hood) && rows) pools.set(hood, slotsOf(rows));
  return FOOD_VENUES.map((venue) => {
    const own = pools.get(venue.neighborhood);
    const slot = own?.shift() ?? pools.get("downtown-pool")?.shift();
    if (!slot) throw new Error(`no storefront slot for ${venue.id}`);
    return slot;
  });
})();

/** The first venue in data order for each interior room gets its street door. */
function isDoorVenue(index: number): boolean {
  const room = FOOD_VENUES[index].room;
  return (
    room !== undefined &&
    FOOD_VENUES.findIndex((v) => v.room === room) === index
  );
}

export type RoomExit = { room: RoomId; door: Vec2; landing: Vec2 };

/** Each interior room's street door, and the spot a doll lands on leaving it. */
export const FOOD_ROOM_EXITS: readonly RoomExit[] = FOOD_VENUES.flatMap(
  (venue, i): RoomExit[] => {
    if (!venue.room || !isDoorVenue(i)) return [];
    const slot = SLOTS[i];
    return [{ room: venue.room, ...doorOf(slot.row, slot.z + DEPTH / 2) }];
  },
);

/** One storefront per venue, in data order, each with its lit sign. */
export const FOOD_STOREFRONTS: readonly Building[] = FOOD_VENUES.map(
  (venue, i): Building => {
    const slot = SLOTS[i];
    const z1 = slot.z + DEPTH;
    const exit = FOOD_ROOM_EXITS.find((e) => e.room === venue.room);
    return {
      id: `food-${venue.id}`,
      neighborhood: cityHood(venue.neighborhood),
      footprint: rect(slot.x0, slot.z, slot.x1, z1),
      height: 9,
      style: "storefront",
      sign: { text: venue.name.toUpperCase(), color: NEON[i % NEON.length] },
      ...(venue.room && exit && isDoorVenue(i)
        ? {
            door: {
              position: exit.door,
              radius: 2,
              label: `Into ${venue.name}`,
              target: venue.room,
              targetSpawn: INTERIOR_SPAWN,
            },
          }
        : {}),
    };
  },
);
