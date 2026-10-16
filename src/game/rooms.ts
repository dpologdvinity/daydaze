import { CITY_AREA, CITY_BOUNDS, CITY_SPAWN } from "./city/layout.ts";
import { FOOD_ROOM_EXITS } from "./food/storefronts.ts";
import {
  INTERIOR_EXIT,
  INTERIOR_FLOOR,
  INTERIOR_SPAWN,
} from "./food/interiors.ts";
import {
  CAROUSEL_AT,
  DROP_TOWER_AT,
  PIRATE_AT,
  SWING_AT,
  TEACUPS_AT,
} from "./amusementPark.ts";
import type { Vec2 } from "./walk.ts";

export type RoomId =
  | "velvet-room"
  | "pulse"
  | "violet-hour"
  | "plaza"
  | "amusement-park"
  | "water-park"
  | "speedway"
  | "apartment"
  | "jail"
  | "filipino-joint"
  | "boba-matcha"
  | "ube-bakery"
  | "aquarium"
  | "city";

export type Spawn = { position: Vec2; yaw: number };

export type RoomDefinition = {
  id: RoomId;
  name: string;
  walkable: readonly Vec2[];
  spawn: Spawn;
  /** Dolls wear their swimsuit look here instead of their outfit. */
  swimwear?: boolean;
  /** Solid footprints on the walkable floor (rides, carts), walked around. */
  blockers?: readonly (readonly Vec2[])[];
  portals: readonly {
    id: string;
    position: Vec2;
    radius: number;
    label: string;
    target: RoomId;
    targetSpawn: Spawn;
  }[];
};

export type Portal = RoomDefinition["portals"][number];

// Velvet Room (prototype lounge): walls at x = +-6 and z = -6, open towards the
// camera at z = +6. The prototype clamped walking to x +-5.3, z -3.9..5.5,
// which keeps the player in front of the bar counter. The notch on the right
// wall wraps the round booth at (4.2, 0.7); every vertex and chord stays at
// least 1.9 m from its centre, the prototype's keep-out radius.
const VELVET_ROOM_FLOOR: readonly Vec2[] = [
  [-5.3, -3.9],
  [5.3, -3.9],
  [5.3, -1.0],
  [4.2, -1.3],
  [3.2, -1.05],
  [2.45, -0.3],
  [2.2, 0.7],
  [2.45, 1.7],
  [3.2, 2.45],
  [4.2, 2.7],
  [5.3, 2.4],
  [5.3, 5.5],
  [-5.3, 5.5],
];

// Pulse: a 10.8 m x 9.1 m dance club. The DJ booth and the podiums stand
// behind the back edge at z = -3.5; the bar runs down the left wall.
const PULSE_FLOOR: readonly Vec2[] = [
  [-5.4, -3.5],
  [5.4, -3.5],
  [5.4, 5.6],
  [-5.4, 5.6],
];

// The Violet Hour: an 8.6 m x 8.6 m bar. The bar counter runs along the back
// wall, the pool table sits past the right edge and the regulars' corner is
// front left.
const VIOLET_HOUR_FLOOR: readonly Vec2[] = [
  [-5.2, -3.2],
  [3.4, -3.2],
  [3.4, 5.4],
  [-5.2, 5.4],
];

// Daydaze Plaza: a 24 m x 14 m night street. Storefronts line the back at
// z = -7, the road runs past the front curb at z = +7, and two 3 m x 1.5 m
// planters cut into the curb.
const PLAZA_FLOOR: readonly Vec2[] = [
  [-12, -7],
  [12, -7],
  [12, 7],
  [6, 7],
  [6, 5.5],
  [3, 5.5],
  [3, 7],
  [-3, 7],
  [-3, 5.5],
  [-6, 5.5],
  [-6, 7],
  [-12, 7],
];

// Amusement Park: an 18 m x 15.5 m midway (x -9..9, z -8..7.5) opening at its
// back onto the fairground among the rides, the water-ride lot on its left
// (x -30..-17, the log flume), and through the carnival arch at z = -30 to the
// back lot and the Starlight coaster. Each ride's footprint is a
// blocker; boarding rings sit in front of them.
const AMUSEMENT_PARK_FLOOR: readonly Vec2[] = [
  [-9, 7.5],
  [-9, -8],
  [-30, -8],
  [-30, -53],
  [17, -53],
  [17, -8],
  [9, -8],
  [9, 7.5],
];

/** A circle as an octagon, for round footprints. */
function round(at: readonly [number, number], r: number): Vec2[] {
  return Array.from({ length: 8 }, (_, i): Vec2 => {
    const a = (i / 8) * Math.PI * 2;
    return [at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)];
  });
}

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

const AMUSEMENT_PARK_BLOCKERS: readonly (readonly Vec2[])[] = [
  round(CAROUSEL_AT, 4.1),
  round(TEACUPS_AT, 3.1),
  round(SWING_AT, 3.5),
  round(DROP_TOWER_AT, 1.2),
  // the log flume's channel, lift and splash pool; its station end at
  // x -21..-17.5, z -8..-17 is open to walk up to
  box(-30, -44, -21, -8),
  box(-21, -44, -17.5, -17),
  // the pirate ship's frame and its swing
  box(PIRATE_AT[0] - 2, PIRATE_AT[1] - 6, PIRATE_AT[0] + 2, PIRATE_AT[1] + 4.2),
  // the ferris wheel's legs and low gondolas
  box(-10, -11, -3, -9),
  // the Comet coaster's towers and low track
  [
    [5, -9.3],
    [12.5, -10.5],
    [15.8, -16],
    [13.5, -22.5],
    [7, -24.8],
    [1.3, -20.5],
    [2.3, -13],
  ],
  // the Starlight's station, lift and towers
  box(-15.5, -52, 16.5, -36.2),
  // food carts at the midway's back corners
  box(-12.4, -10.3, -10.6, -8.7),
  box(10.6, -10.3, 12.4, -8.7),
];

// Water Park: a sunny deck in front of the wave pool (x -10..3, z -9.5..-1.5).
// The slide tower and its spirals fill the back right, the snack bar sits off
// the left edge and the gate to the Plaza is on the right.
const WATER_PARK_FLOOR: readonly Vec2[] = [
  [-10, -1],
  [3.6, -1],
  [3.6, -3.2],
  [11, -3.2],
  [11, 7],
  [-10, 7],
];

// Speedway: a 20 m x 13 m pit apron in front of the track. The grandstand and
// the track sit behind the back edge; the bumper arena is off the right side.
// The gate to the city is on the front edge, right of centre.
const SPEEDWAY_FLOOR: readonly Vec2[] = [
  [-10, -6],
  [10, -6],
  [10, 7],
  [-10, 7],
];

// Apartment: an 8 m x 6 m flat behind the Glass Tower's door. Furniture sits on the
// 8 x 6 grid of 1 m cells in src/game/home/decor.ts, starting at the back left.
const APARTMENT_FLOOR: readonly Vec2[] = [
  [-4, -3],
  [4, -3],
  [4, 3],
  [-4, 3],
];

// Jail: a 12 m x 8 m cell block. The cells line the back, the yard is the
// front strip and the guard's desk sits by the gate.
// The Aquarium, behind its Park Avenue door in Uptown: a 16 m x 14 m hall.
// The shark tunnel runs down the middle (z -6..1), the jellyfish room is the
// left bay and the reef wall the right; the touch pool sits by the door.
const AQUARIUM_FLOOR: readonly Vec2[] = [
  [-8, -7],
  [8, -7],
  [8, 7],
  [-8, 7],
];

/** Where the Aquarium's Park Avenue door stands and its exit lands. */
export const AQUARIUM_DOOR = {
  position: [238, -244.6] as const,
  landing: [238, -248.6] as const,
};

const JAIL_FLOOR: readonly Vec2[] = [
  [-6, -4],
  [6, -4],
  [6, 4],
  [-6, 4],
];

/** A food interior: the shared plan, with the street as its exit. */
function foodRoom(id: RoomId, name: string): RoomDefinition {
  const exit = FOOD_ROOM_EXITS.find((e) => e.room === id);
  if (!exit) throw new Error(`no street door for ${id}`);
  return {
    id,
    name,
    walkable: INTERIOR_FLOOR,
    spawn: INTERIOR_SPAWN,
    portals: [
      {
        id: `${id}-to-city`,
        position: INTERIOR_EXIT,
        radius: 1,
        label: "Back out to the street",
        target: "city",
        targetSpawn: { position: exit.landing, yaw: Math.PI / 2 },
      },
    ],
  };
}

export const ROOMS: Record<RoomId, RoomDefinition> = {
  "velvet-room": {
    id: "velvet-room",
    name: "The Velvet Room",
    walkable: VELVET_ROOM_FLOOR,
    spawn: { position: [0.9, 1.6], yaw: 0.25 },
    portals: [
      {
        // The neon VIP arch on the left wall at (-5.9, -1.5). Leads out to
        // the sidewalk in front of the Velvet Room's door in the city.
        id: "to-city",
        position: [-5.0, -1.5],
        radius: 0.6,
        label: "Out to the street",
        target: "city",
        targetSpawn: { position: [112, -9], yaw: 0 },
      },
      {
        // The way back to the Plaza, by the front opening.
        id: "to-plaza",
        position: [-3.6, 4.6],
        radius: 0.6,
        label: "Back to the Plaza",
        target: "plaza",
        targetSpawn: { position: [0, -4.8], yaw: 0 },
      },
    ],
  },
  pulse: {
    id: "pulse",
    name: "Pulse",
    walkable: PULSE_FLOOR,
    spawn: { position: [0, 2.6], yaw: Math.PI },
    portals: [
      {
        // The street door the player came in through, back to the sidewalk.
        id: "pulse-to-city",
        position: [0, 5.0],
        radius: 0.9,
        label: "Out to the street",
        target: "city",
        targetSpawn: { position: [113, 9], yaw: Math.PI },
      },
    ],
  },
  "violet-hour": {
    id: "violet-hour",
    name: "The Violet Hour",
    walkable: VIOLET_HOUR_FLOOR,
    spawn: { position: [0, 2.6], yaw: Math.PI },
    portals: [
      {
        // The street door the player came in through, back to the sidewalk.
        id: "violet-hour-to-city",
        position: [0, 4.9],
        radius: 0.9,
        label: "Out to the street",
        target: "city",
        targetSpawn: { position: [130, -9], yaw: 0 },
      },
    ],
  },
  plaza: {
    id: "plaza",
    name: "Daydaze Plaza",
    walkable: PLAZA_FLOOR,
    spawn: { position: [0, 2], yaw: Math.PI },
    portals: [
      {
        // The Velvet Room storefront, centred on the back row.
        id: "to-velvet-room",
        position: [0, -6.3],
        radius: 0.7,
        label: "To the Velvet Room",
        target: "velvet-room",
        targetSpawn: { position: [-3.8, -1.5], yaw: Math.PI / 2 },
      },
      {
        // The carnival arch on the right of the curb, a little in from the edge.
        id: "to-amusement-park",
        position: [9.5, 2],
        radius: 0.9,
        label: "To the Amusement Park",
        target: "amusement-park",
        targetSpawn: { position: [0, 4.6], yaw: Math.PI },
      },
      {
        // The surf-shack arch at the east end of the street.
        id: "to-water-park",
        position: [11.4, 0],
        radius: 0.7,
        label: "To the Water Park",
        target: "water-park",
        targetSpawn: { position: [9, 2.5], yaw: -Math.PI / 2 },
      },
      {
        // The pit-lane arch at the west end of the street.
        id: "to-speedway",
        position: [-11.2, 0],
        radius: 0.7,
        label: "To the Speedway",
        target: "speedway",
        targetSpawn: { position: [-8, 0], yaw: Math.PI / 2 },
      },
    ],
  },
  "amusement-park": {
    id: "amusement-park",
    name: "Amusement Park",
    walkable: AMUSEMENT_PARK_FLOOR,
    blockers: AMUSEMENT_PARK_BLOCKERS,
    spawn: { position: [0, 4.6], yaw: Math.PI },
    portals: [
      {
        // The entrance arch the player came in through.
        id: "park-to-plaza",
        position: [0, 6.9],
        radius: 0.9,
        label: "Back to Daydaze Plaza",
        target: "plaza",
        targetSpawn: { position: [9.5, 4.2], yaw: Math.PI },
      },
      {
        // The gate out to the city, a little west of the entrance arch.
        id: "park-to-city",
        position: [-6.5, 6.9],
        radius: 0.9,
        label: "Out through the gate",
        target: "city",
        // the Fairground forecourt, outside the carnival gate
        targetSpawn: { position: [256, 244.5], yaw: 0 },
      },
    ],
  },
  "water-park": {
    id: "water-park",
    name: "The Water Park",
    walkable: WATER_PARK_FLOOR,
    spawn: { position: [6.5, 2.5], yaw: -2.4 },
    swimwear: true,
    portals: [
      {
        // The palm-leaf gate on the east edge.
        id: "water-park-to-plaza",
        position: [10.4, 2.5],
        radius: 0.6,
        label: "To the Plaza",
        target: "plaza",
        targetSpawn: { position: [10, 0], yaw: -Math.PI / 2 },
      },
      {
        // The gate out to the city, on the west side of the deck.
        id: "water-park-to-city",
        position: [-7.5, 4.5],
        radius: 0.9,
        label: "Out through the gate",
        target: "city",
        targetSpawn: { position: [4, -9], yaw: 0 },
      },
    ],
  },
  speedway: {
    id: "speedway",
    name: "The Speedway",
    walkable: SPEEDWAY_FLOOR,
    spawn: { position: [-8, 0], yaw: Math.PI / 2 },
    portals: [
      {
        // The pit-lane arch the player came in through, back to the Plaza.
        id: "speedway-to-plaza",
        position: [-9.6, 5.8],
        radius: 0.8,
        label: "Back to Daydaze Plaza",
        target: "plaza",
        targetSpawn: { position: [-9.2, 1.5], yaw: Math.PI / 2 },
      },
      {
        // The gate out to the city, on the Fairground forecourt.
        id: "speedway-to-city",
        position: [9.4, 5.8],
        radius: 0.9,
        label: "Out through the gate",
        target: "city",
        targetSpawn: { position: [384, 244.5], yaw: 0 },
      },
    ],
  },
  "filipino-joint": foodRoom("filipino-joint", "Point and Eat Kitchen"),
  "boba-matcha": foodRoom(
    "boba-matcha",
    "Jade Whisk Matcha and Pearl Ledger Boba",
  ),
  "ube-bakery": foodRoom("ube-bakery", "Purple Pandesal Bakery"),
  city: {
    id: "city",
    name: "Downtown and Nightlife Row",
    // The bounds; the walkable surfaces and blockers live in CITY_AREA.
    walkable: CITY_BOUNDS,
    spawn: CITY_SPAWN,
    portals: CITY_AREA.portals,
  },
  apartment: {
    id: "apartment",
    name: "Your apartment",
    walkable: APARTMENT_FLOOR,
    spawn: { position: [0, 1.8], yaw: Math.PI },
    portals: [
      {
        // The tower's front door, back to the sidewalk outside.
        id: "apartment-to-city",
        position: [0, 2.9],
        radius: 0.7,
        label: "Out to the street",
        target: "city",
        targetSpawn: { position: [-165, 9], yaw: 0 },
      },
    ],
  },
  aquarium: {
    id: "aquarium",
    name: "Uptown Aquarium",
    walkable: AQUARIUM_FLOOR,
    spawn: { position: [0, 5.2], yaw: Math.PI },
    portals: [
      {
        id: "aquarium-to-city",
        position: [0, 6.4],
        radius: 0.8,
        label: "Out to Park Avenue",
        target: "city",
        targetSpawn: { position: AQUARIUM_DOOR.landing, yaw: 0 },
      },
    ],
  },
  jail: {
    id: "jail",
    name: "City Jail, Block C",
    walkable: JAIL_FLOOR,
    spawn: { position: [0, 2.6], yaw: Math.PI },
    portals: [
      {
        // The gate, back out to the sidewalk. Released players arrive here.
        id: "jail-to-city",
        position: [0, 3.6],
        radius: 0.7,
        label: "Out through the gate",
        target: "city",
        targetSpawn: { position: [-86, 9], yaw: 0 },
      },
    ],
  },
};

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === "string" && Object.hasOwn(ROOMS, value);
}
