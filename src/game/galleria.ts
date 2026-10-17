// The Starlight Galleria: a big shopping mall on Beachside's Shore
// Boulevard. One great hall under a glass roof: five stores along the north
// wall (three of them sell, through shop.ts), the cinema on the west wall,
// the food court on the east, a fountain in the atrium with benches round
// it, kiosk carts, and escalators up to the balcony. One layout, shared by
// the room's floor and blockers (rooms.ts), its seats and the client.
import type { ShopId } from "./shop.ts";
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -14, x1: 14, z0: -9.4, z1: 9.6 } as const;
export const NORTH_Z = -10;

export type Store = {
  id: string;
  name: string;
  /** The store's centre along the north wall. */
  x: number;
  color: string;
  /** Which shop.ts store it sells from, if it sells. */
  shop: ShopId | null;
};

export const STORES: readonly Store[] = [
  {
    id: "glitterbox",
    name: "Glitterbox",
    x: -11,
    color: "#ff4fb3",
    shop: "boutique",
  },
  {
    id: "gloss-glow",
    name: "Gloss & Glow",
    x: -5.5,
    color: "#ffd1f0",
    shop: "beauty",
  },
  {
    id: "curl-chrome",
    name: "Curl & Chrome",
    x: 0,
    color: "#4fe3ff",
    shop: "salon",
  },
  {
    id: "platform-palace",
    name: "Platform Palace",
    x: 5.5,
    color: "#ffd84f",
    shop: null,
  },
  { id: "track-99", name: "Track 99", x: 11, color: "#b06bff", shop: null },
];
export const STORE_WIDTH = 5;
/** Where each store's clerk stands, in its doorway. */
export const clerkSpot = (store: Store): Vec2 => [store.x, NORTH_Z + 0.9];

/** The atrium fountain off the main walk, and backless benches on its
 * south side, facing it. */
export const FOUNTAIN: Vec2 = [-7.5, 0.5];
export const FOUNTAIN_R = 2;
export const ATRIUM_BENCHES: readonly Vec2[] = [
  [-9.3, 4.2],
  [-5.7, 4.2],
];

/** The food court on the east side: branches of city food venues (by
 * venues.ts id) on the wall, tables in front. */
export const STALL_X = 13.2;
export const STALLS: readonly { venue: string; z: number; color: string }[] = [
  { venue: "glaze-lab-donuts", z: -5.5, color: "#ffb02e" },
  { venue: "juice-jam-bar", z: -1.5, color: "#7dff6b" },
  { venue: "slice-window-thirteen", z: 2.5, color: "#ff5c5c" },
];
export const TABLES: readonly Vec2[] = [
  [8.4, -1.4],
  [8.4, 2.2],
  [8.4, 5.8],
];
export const TABLE_SEATS: readonly { at: Vec2; facing: Vec2 }[] =
  TABLES.flatMap(([x, z]) =>
    [-0.75, 0.75].map((dx) => ({
      at: [x + dx, z] as Vec2,
      facing: [x, z] as Vec2,
    })),
  );
/** Food court chairs shoppers already sit in, kept from the player. */
export const DINER_SEATS: readonly number[] = [1, 4];

/** The cinema's doors and box office on the west wall, south end. */
export const CINEMA = { z0: 1.5, z1: 8 } as const;
/** Escalators up the west wall to the balcony over the stores. */
export const ESCALATORS = { x0: -13.6, x1: -11.6, z0: -7.5, z1: -2.5 } as const;
/** Kiosk carts, off the walks between the doors and the stores. */
export const KIOSKS: readonly Vec2[] = [
  [11.6, 7.2],
  [-12.6, -0.8],
];

export const EXIT: Vec2 = [0, 9.2];
export const SPAWN: Vec2 = [0, 8];
export const GALLERIA_DOOR = {
  position: [-250, 244.4] as const,
  landing: [-250, 247.6] as const,
};
export const GALLERIA_LOT = { x0: -296, x1: -204, z0: 206, z1: 243 } as const;

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

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  Array.from({ length: 8 }, (_, i): Vec2 => {
    const a = (i / 8) * Math.PI * 2;
    return [
      FOUNTAIN[0] + Math.sin(a) * FOUNTAIN_R,
      FOUNTAIN[1] + Math.cos(a) * FOUNTAIN_R,
    ];
  }),
  ...STALLS.map(({ z }) =>
    box(STALL_X - 0.6, z - 1.4, FLOOR_BOUNDS.x1, z + 1.4),
  ),
  ...TABLES.map(([x, z]) => box(x - 0.35, z - 0.35, x + 0.35, z + 0.35)),
  box(ESCALATORS.x0, ESCALATORS.z0, ESCALATORS.x1, ESCALATORS.z1),
  ...KIOSKS.map(([x, z]) => box(x - 0.6, z - 0.4, x + 0.6, z + 0.4)),
];
