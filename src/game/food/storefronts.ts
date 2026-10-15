// The food venues as storefronts in the city. Each venue gets one building on
// a sidewalk row beside the north-south streets, in data order. A venue with an
// interior room gets a street door on the east row, facing the avenue.
import type { Building } from "../city/layout.ts";
import type { RoomId } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";
import { INTERIOR_SPAWN } from "./interiors.ts";
import { FOOD_VENUES } from "./venues.ts";

type Row = { x0: number; x1: number; z0: number; count: number };

// Rows sit beside the cross streets. Their sidewalks run 4 m beyond the kerb,
// and every storefront stops short of them.
const STEP = 6.5;
const DEPTH = 6;
const ROWS: readonly Row[] = [
  // east of b-south: the door row
  { x0: 74, x1: 81, z0: 96, count: 13 },
  // west of b-south
  { x0: 47, x1: 54, z0: 96, count: 13 },
  // west of a-south
  { x0: -81, x1: -74, z0: 100, count: 13 },
  // east of a-south
  { x0: -54, x1: -47, z0: 124, count: 9 },
  // b-north, both sides
  { x0: 47, x1: 54, z0: -188, count: 13 },
  { x0: 74, x1: 81, z0: -188, count: 13 },
  // a-north, both sides
  { x0: -81, x1: -74, z0: -188, count: 13 },
  { x0: -54, x1: -47, z0: -188, count: 13 },
];

/** Street doors stand on the east row's sidewalk; the doll lands one step out. */
const DOOR_X = 72.5;
const LANDING_X = 70;
// The landing sits 2.5 m out, past the 2 m door trigger, so leaving never re-enters.
const NEON = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff", "#ff8a3d"];

function rect(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

type Slot = { x0: number; x1: number; z: number };

const SLOTS: readonly Slot[] = ROWS.flatMap((row) =>
  Array.from({ length: row.count }, (_, i) => ({
    x0: row.x0,
    x1: row.x1,
    z: row.z0 + STEP * i,
  })),
);

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
    const z = SLOTS[i].z + DEPTH / 2;
    return [{ room: venue.room, door: [DOOR_X, z], landing: [LANDING_X, z] }];
  },
);

if (SLOTS.length < FOOD_VENUES.length)
  throw new Error("not enough storefront slots");

/** One storefront per venue, in data order, each with its lit sign. */
export const FOOD_STOREFRONTS: readonly Building[] = FOOD_VENUES.map(
  (venue, i): Building => {
    const slot = SLOTS[i];
    const z1 = slot.z + DEPTH;
    const exit = FOOD_ROOM_EXITS.find((e) => e.room === venue.room);
    return {
      id: `food-${venue.id}`,
      neighborhood: "downtown",
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
