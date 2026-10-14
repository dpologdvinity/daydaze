import type { Vec2 } from "./walk.ts";

export type RoomId = "velvet-room" | "plaza" | "amusement-park";

export type Spawn = { position: Vec2; yaw: number };

export type RoomDefinition = {
  id: RoomId;
  name: string;
  walkable: readonly Vec2[];
  spawn: Spawn;
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

// Amusement Park: a 18 m x 15.5 m midway. Rides stand behind the back edge at
// z = -8, beyond the walkable floor, and each boarding ring sits inside it.
const AMUSEMENT_PARK_FLOOR: readonly Vec2[] = [
  [-9, -8],
  [9, -8],
  [9, 7.5],
  [-9, 7.5],
];

export const ROOMS: Record<RoomId, RoomDefinition> = {
  "velvet-room": {
    id: "velvet-room",
    name: "The Velvet Room",
    walkable: VELVET_ROOM_FLOOR,
    spawn: { position: [0.9, 1.6], yaw: 0.25 },
    portals: [
      {
        // The neon VIP arch on the left wall at (-5.9, -1.5).
        id: "to-plaza",
        position: [-5.0, -1.5],
        radius: 0.6,
        label: "To the Plaza",
        target: "plaza",
        targetSpawn: { position: [0, -4.8], yaw: 0 },
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
    ],
  },
  "amusement-park": {
    id: "amusement-park",
    name: "Amusement Park",
    walkable: AMUSEMENT_PARK_FLOOR,
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
    ],
  },
};

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === "string" && Object.hasOwn(ROOMS, value);
}
