// The Chinatown and Koreatown night market: a paved square off the west
// sidewalk of the neighbourhood's cross street (x 320), just south of the
// avenue's shopfronts. Two rows of stalls face each other across a lane,
// red lanterns hang over the lane and across the street, and a vendor works
// each stall. Pure data: layout.ts makes the square walkable and the stalls
// and poles solid; src/client/city/NightMarket.tsx draws it.
import {
  DEFAULT_LOOK,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKINS,
  type Look,
} from "../look.ts";
import type { Vec2 } from "../walk.ts";
import { hash, pick } from "./hash.ts";

/** The square: west of the cross street's west sidewalk (x 311). */
export const MARKET = { x0: 276, x1: 311, z0: 44, z1: 62 } as const;
/** Where the lantern strings meet the shopfronts across the street. */
const FACADE_X = 330;

export const MARKET_FOODS = [
  "DUMPLINGS",
  "TTEOKBOKKI",
  "BUBBLE WAFFLES",
  "SKEWERS",
  "BOBA",
  "BAO",
  "HOTTEOK",
  "FISH BALLS",
] as const;
export type MarketFood = (typeof MARKET_FOODS)[number];

/** Foods cooked on the spot, so their stalls steam. */
const STEAMING: readonly MarketFood[] = [
  "DUMPLINGS",
  "TTEOKBOKKI",
  "SKEWERS",
  "BAO",
  "HOTTEOK",
  "FISH BALLS",
];

export type Stall = {
  /** The middle of the stall's footprint. */
  at: Vec2;
  /** The way its counter faces: +1 south (+z), -1 north. */
  facing: 1 | -1;
  food: MarketFood;
  steam: boolean;
  awning: string;
};

/** Counter width along the row, and depth back from the counter. */
export const STALL_W = 3.2;
export const STALL_D = 2.6;
const PER_ROW = 7;
const STEP = 4.4;
const AWNINGS = [
  "#d62828",
  "#f77f00",
  "#fcbf49",
  "#2a9d8f",
  "#e5383b",
  "#ff4fb3",
];

export const STALLS: readonly Stall[] = [1, -1].flatMap((facing) =>
  Array.from({ length: PER_ROW }, (_, i): Stall => {
    const k = facing === 1 ? i : PER_ROW + i;
    const food = MARKET_FOODS[(k * 3) % MARKET_FOODS.length];
    return {
      at: [
        MARKET.x0 + 4 + STEP * i,
        facing === 1
          ? MARKET.z0 + 1 + STALL_D / 2
          : MARKET.z1 - 1 - STALL_D / 2,
      ],
      facing: facing === 1 ? 1 : -1,
      food,
      steam: STEAMING.includes(food),
      awning: AWNINGS[k % AWNINGS.length],
    };
  }),
);

function rect(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export function stallFootprint({ at: [x, z] }: Stall): Vec2[] {
  return rect(
    x - STALL_W / 2,
    z - STALL_D / 2,
    x + STALL_W / 2,
    z + STALL_D / 2,
  );
}

/** Lantern strings: aisle strings run pole to pole down the lane; street
 * strings run from a pole at the square's edge to the shopfronts opposite. */
export type LanternString = { from: Vec2; to: Vec2; y: number; sag: number };

const LANE_ZS = [50, 56];
const STREET_ZS = [46.5, 50, 56, 59.5];
const POLE_EAST = MARKET.x1 - 0.4;
const POLE_WEST = MARKET.x0 + 1;

export const LANTERN_STRINGS: readonly LanternString[] = [
  ...LANE_ZS.map((z): LanternString => ({
    from: [POLE_WEST, z],
    to: [POLE_EAST, z],
    y: 5.6,
    sag: 0.9,
  })),
  ...STREET_ZS.map((z): LanternString => ({
    from: [POLE_EAST, z],
    to: [FACADE_X, z],
    y: 6.2,
    sag: 0.7,
  })),
];

/** The poles the strings hang from, all inside the square. */
export const LANTERN_POLES: readonly Vec2[] = [
  ...LANE_ZS.map((z): Vec2 => [POLE_WEST, z]),
  ...STREET_ZS.map((z): Vec2 => [POLE_EAST, z]),
];
export const POLE_HALF = 0.12;

/** A lantern every LANTERN_GAP metres along each string, hanging from it. */
const LANTERN_GAP = 1.9;
export type Lantern = { x: number; y: number; z: number; phase: number };

export const LANTERNS: readonly Lantern[] = LANTERN_STRINGS.flatMap((s, si) => {
  const length = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]);
  const n = Math.max(1, Math.round(length / LANTERN_GAP));
  // skip the ends: they sit on the pole and the wall
  return Array.from({ length: n - 1 }, (_, k): Lantern => {
    const t = (k + 1) / n;
    return {
      x: s.from[0] + (s.to[0] - s.from[0]) * t,
      y: s.y - s.sag * 4 * t * (1 - t),
      z: s.from[1] + (s.to[1] - s.from[1]) * t,
      phase: hash(si, k) * Math.PI * 2,
    };
  });
});

/** Everything solid in the market: stall footprints and lantern poles. */
export const MARKET_BLOCKERS: readonly (readonly Vec2[])[] = [
  ...STALLS.map(stallFootprint),
  ...LANTERN_POLES.map(([x, z]) =>
    rect(x - POLE_HALF, z - POLE_HALF, x + POLE_HALF, z + POLE_HALF),
  ),
];

export type MarketPerson = { at: Vec2; yaw: number; look: Look };

const MARKET_HAIR = ["bob", "ponytail", "buns", "waves", "braids"] as const;
const MARKET_OUTFITS = ["jeans", "blouse", "flares", "mini"] as const;

function lookOf(i: number): Look {
  return {
    ...DEFAULT_LOOK,
    skin: pick(SKINS, hash(i, 1)).id,
    hairStyle: pick(MARKET_HAIR, hash(i, 2)),
    hairColor: pick(HAIR_COLORS, hash(i, 3)).id,
    outfit: pick(MARKET_OUTFITS, hash(i, 4)),
    outfitColor: pick(OUTFIT_COLORS, hash(i, 5)).id,
  };
}

/** A vendor behind every counter, facing out; a few shoppers at the
 * counters, facing in. (sin yaw, cos yaw) is the way each one faces. */
export const MARKET_PEOPLE: readonly MarketPerson[] = [
  ...STALLS.map(({ at: [x, z], facing }, i): MarketPerson => ({
    at: [x, z - facing * 0.3],
    yaw: facing === 1 ? 0 : Math.PI,
    look: lookOf(i),
  })),
  ...[1, 4, 9, 12].map((s, i): MarketPerson => {
    const { at, facing } = STALLS[s];
    return {
      at: [at[0] + 0.4, at[1] + facing * (STALL_D / 2 + 0.7)],
      yaw: facing === 1 ? Math.PI : 0,
      look: lookOf(100 + i),
    };
  }),
];

/** The indices of the `count` market people nearest `at`, within `radius`
 * metres, nearest first. */
export function nearestMarketPeople(
  at: Vec2,
  count: number,
  radius: number,
): number[] {
  return MARKET_PEOPLE.map((p, i) => ({
    i,
    d: Math.hypot(p.at[0] - at[0], p.at[1] - at[1]),
  }))
    .filter((n) => n.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((n) => n.i);
}

/** The middle of the market, for culling the whole thing by distance. */
export const MARKET_CENTER: Vec2 = [
  (MARKET.x0 + FACADE_X) / 2,
  (MARKET.z0 + MARKET.z1) / 2,
];
