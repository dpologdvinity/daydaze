// The Uptown farmers market: on weekends (the player's own clock, like the
// city's daylight) eight timber stalls on the green west of the park's
// north-south path open up under their striped awnings, with crates of
// produce, bunting and a vendor behind every counter. The stalls themselves
// stand all week (closed, bare and unmanned), so the walk rules never change.
// Four stalls sell a crop you can sell back at Sunny Acres Farm's stand
// (farm.ts groceries) for more than it fetches there; the other four are
// for browsing and chatting. Pure data and rules; FarmersMarket.tsx draws it.
import { CROPS, type CropId, type FarmSave } from "../farm.ts";
import {
  DEFAULT_LOOK,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKINS,
  type Look,
} from "../look.ts";
import { spend } from "../wallet.ts";
import type { Vec2 } from "../walk.ts";
import { hash, pick } from "./hash.ts";
import { MARKET_GREEN } from "./park.ts";

/** The days it opens (Date.getDay: 0 Sunday, 6 Saturday) and the hours. */
export const OPEN_DAYS: readonly number[] = [0, 6];
export const OPEN_FROM = 8;
export const OPEN_UNTIL = 16;

/** Whether the market is open on `day` (getDay) at `hour` (0..24, fractions for minutes). */
export const marketOpen = (day: number, hour: number): boolean =>
  OPEN_DAYS.includes(day) && hour >= OPEN_FROM && hour < OPEN_UNTIL;

/** `?market=1` (open) or `?market=0` (closed) from a query string, or null. */
export function marketFlag(search: string): boolean | null {
  const m = /[?&]market=([01])(?:&|$)/.exec(search);
  return m ? m[1] === "1" : null;
}

/** The lane between the two rows, down the middle of the green. */
export const LANE_X = (MARKET_GREEN.x0 + MARKET_GREEN.x1) / 2;
/** Where the customers stand along the lane, north to south. */
export const LANE_Z0 = MARKET_GREEN.z0;
export const LANE_Z1 = MARKET_GREEN.z1;

/** The stall model (farm/market-stand.glb, 0.95 x 1.19 m) is drawn this big. */
export const STALL_SCALE = 2.4;
/** Its footprint at that size: depth (toward the lane) and width (along it). */
export const STALL_DEPTH = 0.95 * STALL_SCALE;
export const STALL_WIDTH = 1.19 * STALL_SCALE;
/** The top of its shelf above the ground, and how far the shelf reaches (half sizes). */
export const SHELF_Y = 0.49 * STALL_SCALE;
export const SHELF_HALF: Vec2 = [0.3 * STALL_SCALE, 0.52 * STALL_SCALE];

/** The produce models (public/models/props/food-<name>.glb) and how big each is drawn (m). */
export const PRODUCE_SIZE = {
  Apple: 0.16,
  Orange: 0.16,
  Banana: 0.22,
  Carrot: 0.26,
  Turnip: 0.2,
  Lettuce_Whole: 0.26,
  Tomato: 0.15,
  Pepper_Red: 0.17,
  Eggplant: 0.24,
  Pumpkin: 0.34,
  Avocado: 0.14,
  Broccoli: 0.22,
  Bread: 0.3,
} as const;
export type Produce = keyof typeof PRODUCE_SIZE;
export const PRODUCE = Object.keys(PRODUCE_SIZE) as Produce[];

export type MarketStall = {
  id: string;
  name: string;
  /** The middle of the footprint. */
  at: Vec2;
  /** Yaw of the model: 0 faces +x (the west row), PI faces -x (the east row). */
  yaw: number;
  /** The crop its vendor sells for coins, if any. */
  sells: CropId | null;
  /** What is piled on the shelf and in the crates. */
  display: readonly Produce[];
  awning: string;
  vendor: { name: string; look: Look };
};

/** Z of each stall in a row, and how far a row stands from the lane. */
const ROW_Z = [-309.6, -305.2, -300.8, -296.4] as const;
const ROW_X = [LANE_X - 3.6, LANE_X + 3.6] as const;

const HAIR = [
  "bob",
  "ponytail",
  "buns",
  "waves",
  "braids",
  "coils",
  "crop",
] as const;
const OUTFITS = ["jeans", "blouse", "flares", "shorts", "denim-shirt"] as const;

function vendorLook(i: number): Look {
  return {
    ...DEFAULT_LOOK,
    skin: pick(SKINS, hash(i, 91)).id,
    hairStyle: pick(HAIR, hash(i, 92)),
    hairColor: pick(HAIR_COLORS, hash(i, 93)).id,
    outfit: pick(OUTFITS, hash(i, 94)),
    outfitColor: pick(OUTFIT_COLORS, hash(i, 95)).id,
  };
}

const STALL_DEFS: readonly {
  name: string;
  vendor: string;
  sells: CropId | null;
  display: readonly Produce[];
  awning: string;
}[] = [
  {
    name: "Marigold Roots",
    vendor: "Hollis",
    sells: "carrot",
    display: ["Carrot", "Turnip", "Lettuce_Whole"],
    awning: "#e8782a",
  },
  {
    name: "Red Barn Tomatoes",
    vendor: "Marisol",
    sells: "tomato",
    display: ["Tomato", "Pepper_Red", "Eggplant"],
    awning: "#c8362f",
  },
  {
    name: "Cob & Kernel",
    vendor: "Dev",
    sells: "corn",
    display: ["Pumpkin", "Avocado", "Broccoli"],
    awning: "#e2b32f",
  },
  {
    name: "Daisy's Bakehouse",
    vendor: "Ines",
    sells: "wheat",
    display: ["Bread", "Apple", "Orange"],
    awning: "#d9a5b8",
  },
  {
    name: "Orchard Row",
    vendor: "Tamsin",
    sells: null,
    display: ["Apple", "Orange", "Banana"],
    awning: "#4f9a56",
  },
  {
    name: "Gourd Squad",
    vendor: "Okoye",
    sells: null,
    display: ["Pumpkin", "Eggplant", "Turnip"],
    awning: "#8a5fb5",
  },
  {
    name: "Green Thumb Greens",
    vendor: "Bao",
    sells: null,
    display: ["Lettuce_Whole", "Broccoli", "Avocado"],
    awning: "#2f8f83",
  },
  {
    name: "Sunny Side Stand",
    vendor: "Rosa",
    sells: null,
    display: ["Banana", "Orange", "Tomato"],
    awning: "#e4c83a",
  },
];

export const STALLS: readonly MarketStall[] = STALL_DEFS.map((def, i) => {
  const west = i < 4;
  return {
    id: `stall-${i}`,
    name: def.name,
    at: [ROW_X[west ? 0 : 1], ROW_Z[i % 4]],
    yaw: west ? 0 : Math.PI,
    sells: def.sells,
    display: def.display,
    awning: def.awning,
    vendor: { name: def.vendor, look: vendorLook(i) },
  };
});

const rect = (x0: number, z0: number, x1: number, z1: number): Vec2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

/** A stall's solid footprint (its depth runs along x). */
export const stallFootprint = ({ at: [x, z] }: MarketStall): Vec2[] =>
  rect(
    x - STALL_DEPTH / 2,
    z - STALL_WIDTH / 2,
    x + STALL_DEPTH / 2,
    z + STALL_WIDTH / 2,
  );

/** Every stall is solid all week. */
export const MARKET_BLOCKERS: readonly (readonly Vec2[])[] =
  STALLS.map(stallFootprint);

/** Where a vendor stands: behind the counter, facing the lane. */
export const vendorSpot = (s: MarketStall): { at: Vec2; yaw: number } => ({
  at: [s.at[0] - Math.cos(s.yaw) * 0.45, s.at[1]],
  // yaw 0 faces +x: (sin yaw, cos yaw) is the way a doll faces
  yaw: s.yaw === 0 ? Math.PI / 2 : -Math.PI / 2,
});

/** The stall whose counter `at` is within `range` meters of, nearest first, or null. */
export function stallNear(at: Vec2, range = 3.2): MarketStall | null {
  let best: MarketStall | null = null;
  let bestD = range;
  for (const s of STALLS) {
    // the customer side: the lane edge of the stall
    const d = Math.hypot(
      at[0] - (s.at[0] + Math.cos(s.yaw) * STALL_DEPTH * 0.5),
      at[1] - s.at[1],
    );
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** Whether (x, z) is on the market green, `pad` meters out. */
export const onGreen = (x: number, z: number, pad = 0): boolean =>
  x > MARKET_GREEN.x0 - pad &&
  x < MARKET_GREEN.x1 + pad &&
  z > MARKET_GREEN.z0 - pad &&
  z < MARKET_GREEN.z1 + pad;

/** What a crate of produce costs at the market: more than the farm stand pays. */
export const marketPrice = (crop: CropId): number =>
  Math.ceil(CROPS[crop].sellPrice * 1.5);

/**
 * Buys one bunch of `crop` into the farm's groceries, or null when the coins
 * fall short.
 */
export function buyProduce(
  farm: FarmSave,
  coins: number,
  crop: CropId,
): { farm: FarmSave; coins: number } | null {
  const left = spend(coins, marketPrice(crop));
  if (left === null) return null;
  return {
    coins: left,
    farm: {
      ...farm,
      groceries: { ...farm.groceries, [crop]: (farm.groceries[crop] || 0) + 1 },
    },
  };
}
