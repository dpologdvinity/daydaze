// Fishing off the marina dock, boardwalk pier, farm pond, forest lake and
// open water: five casts. Set the cast's power, wait for the bobber to dip,
// and strike the moment it does. The further out the cast lands, the bigger
// the fish that can bite; a quick strike lands it whole, a slow one lets
// the big ones slip. Pure and deterministic: a cast's seed fixes when it
// bites and what's on the line.

export const CASTS = 5;
/** How far a cast lands, meters, from no power to full. */
export const CAST_RANGE = [6, 26] as const;
/** Seconds the bobber stays under once it dips: strike within this. */
export const HOOK_WINDOW = 0.8;
/** Strikes quicker than this land the fish at its best. */
const SHARP = 0.3;

export type Species = {
  name: string;
  /** Weight range, kg. */
  kg: readonly [number, number];
  /** Only bites casts at least this far out, meters. */
  reach: number;
  /** Relative chance among the species in reach. */
  weight: number;
};

export const MARINA_SPECIES: readonly Species[] = [
  { name: "Sardine", kg: [0.1, 0.3], reach: 0, weight: 5 },
  { name: "Mackerel", kg: [0.5, 1.5], reach: 0, weight: 4 },
  { name: "Sea bass", kg: [1, 4], reach: 10, weight: 3 },
  { name: "Red snapper", kg: [2, 6], reach: 14, weight: 2.5 },
  { name: "Yellowtail", kg: [4, 10], reach: 18, weight: 1.5 },
  { name: "Sunset marlin", kg: [15, 40], reach: 22, weight: 0.4 },
];

export const SPECIES: readonly Species[] = [
  { name: "Sardine", kg: [0.1, 0.3], reach: 0, weight: 5 },
  { name: "Mackerel", kg: [0.5, 1.5], reach: 0, weight: 4 },
  { name: "Sea bass", kg: [1, 4], reach: 10, weight: 3 },
  { name: "Red snapper", kg: [2, 6], reach: 14, weight: 2.5 },
  { name: "Yellowtail", kg: [4, 10], reach: 18, weight: 1.5 },
  { name: "Sunset marlin", kg: [15, 40], reach: 22, weight: 0.4 },
];

export const BOARDWALK_SPECIES: readonly Species[] = [
  { name: "Sardine", kg: [0.1, 0.3], reach: 0, weight: 5 },
  { name: "Mackerel", kg: [0.5, 1.5], reach: 0, weight: 4 },
  { name: "Sea bass", kg: [1, 4], reach: 10, weight: 3 },
];

export const FARM_SPECIES: readonly Species[] = [
  { name: "Minnow", kg: [0.05, 0.2], reach: 0, weight: 5 },
  { name: "Bluegill", kg: [0.2, 0.7], reach: 0, weight: 4 },
  { name: "Pond perch", kg: [0.4, 1.4], reach: 5, weight: 3 },
  { name: "Mud carp", kg: [1.0, 3.5], reach: 8, weight: 2 },
  { name: "Golden koi", kg: [1.5, 5.0], reach: 11, weight: 1 },
];

export const FOREST_SPECIES: readonly Species[] = [
  { name: "Brook trout", kg: [0.3, 1.2], reach: 0, weight: 5 },
  { name: "Rainbow trout", kg: [0.8, 2.8], reach: 5, weight: 4 },
  { name: "Smallmouth bass", kg: [1.0, 3.2], reach: 9, weight: 3 },
  { name: "Silver salmon", kg: [2.5, 7.0], reach: 12, weight: 2 },
  { name: "Pike", kg: [4.0, 10.0], reach: 15, weight: 1 },
];

export const OPEN_WATER_SPECIES: readonly Species[] = [
  { name: "Sea bass", kg: [1.0, 4.0], reach: 0, weight: 3 },
  { name: "Red snapper", kg: [2.0, 6.5], reach: 8, weight: 3 },
  { name: "Yellowtail", kg: [4.0, 10.0], reach: 14, weight: 2.5 },
  { name: "Kingfish", kg: [8.0, 18.0], reach: 18, weight: 2 },
  { name: "Giant trevally", kg: [12.0, 28.0], reach: 22, weight: 1.5 },
  { name: "Bluefin tuna", kg: [25.0, 55.0], reach: 26, weight: 0.8 },
];

export type FishingSpotId =
  "marina" | "boardwalk" | "farm" | "forest" | "open-water";

export type FishingSpotConfig = {
  readonly id: FishingSpotId;
  readonly name: string;
  readonly room: "marina" | "city" | "farm" | "forest" | "open-water";
  /** [x, z] where the player stands */
  readonly position: readonly [number, number];
  /** Direction along Z: -1 = casting north (-z), 1 = casting south (+z) */
  readonly dir: 1 | -1;
  /** Player yaw angle in radians */
  readonly yaw: number;
  /** Water surface Y coordinate */
  readonly waterY: number;
  /** Species available at this spot */
  readonly species: readonly Species[];
  /** Optional spot-specific cast range [min, max] in meters */
  readonly castRange?: readonly [number, number];
  /** Short prompt description */
  readonly description: string;
};

export const FISHING_SPOTS: Record<FishingSpotId, FishingSpotConfig> = {
  marina: {
    id: "marina",
    name: "Starboard Marina",
    room: "marina",
    position: [0, -11.2],
    dir: -1,
    yaw: Math.PI,
    waterY: -0.5,
    species: MARINA_SPECIES,
    description: "Five casts off the end of the marina dock.",
  },
  boardwalk: {
    id: "boardwalk",
    name: "Boardwalk Pier",
    room: "city",
    position: [12, 338.5],
    dir: 1,
    yaw: 0,
    waterY: -0.05,
    species: BOARDWALK_SPECIES,
    description: "Five casts off the city boardwalk pier.",
  },
  farm: {
    id: "farm",
    name: "Sunny Acres Pond",
    room: "farm",
    position: [17, 8],
    dir: -1,
    yaw: Math.PI,
    waterY: 0.02,
    species: FARM_SPECIES,
    castRange: [4, 14],
    description: "Five casts into the quiet farm pond.",
  },
  forest: {
    id: "forest",
    name: "Larkspur Lake",
    room: "forest",
    position: [-14, -11],
    dir: -1,
    yaw: Math.PI,
    waterY: 0.05,
    species: FOREST_SPECIES,
    castRange: [5, 18],
    description: "Five casts into the tranquil forest lake.",
  },
  "open-water": {
    id: "open-water",
    name: "Open Water",
    room: "open-water",
    position: [-14, 1],
    dir: -1,
    yaw: Math.PI,
    waterY: 0,
    species: OPEN_WATER_SPECIES,
    castRange: [8, 30],
    description: "Five casts from the boat into deep open water.",
  },
};

function rand(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const clamp01 = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;

/** Where a cast with `power` (0..1) lands, meters out. */
export function castDistance(
  power: number,
  range: readonly [number, number] = CAST_RANGE,
): number {
  const p = clamp01(power);
  return range[0] + (range[1] - range[0]) * p;
}

/** Seconds after the bobber lands until a fish bites. */
export function biteDelay(seed: number): number {
  return 1.6 + rand(seed) * 3.4;
}

/** What's on the line for a cast `distance` out. */
export function speciesFor(
  seed: number,
  distance: number,
  species: readonly Species[] = SPECIES,
): Species {
  const pool = species.filter((s) => distance >= s.reach);
  const total = pool.reduce((t, s) => t + s.weight, 0);
  let pick = rand(seed + 0.5) * total;
  for (const s of pool) {
    pick -= s.weight;
    if (pick <= 0) return s;
  }
  return pool[pool.length - 1];
}

export type Catch = {
  species: string;
  /** kg, to a tenth; 0 when it got away. */
  kg: number;
  outcome: "landed" | "lost" | "early";
};

/**
 * The strike `reaction` seconds after the bite (negative: before it, which
 * spooks the fish). Quick strikes land the fish at full size, slower ones
 * land it smaller, and the heavy ones get away; past the window it's gone.
 */
export function strike(
  seed: number,
  distance: number,
  reaction: number,
  species: readonly Species[] = SPECIES,
): Catch {
  const fish = speciesFor(seed, distance, species);
  if (!Number.isFinite(reaction) || reaction < 0)
    return { species: fish.name, kg: 0, outcome: "early" };
  if (reaction > HOOK_WINDOW)
    return { species: fish.name, kg: 0, outcome: "lost" };
  const [lo, hi] = fish.kg;
  const size = lo + (hi - lo) * rand(seed + 0.25);
  const sharp = reaction <= SHARP;
  // a slow strike on a big fish: it throws the hook
  if (!sharp && hi >= 10) return { species: fish.name, kg: 0, outcome: "lost" };
  const kg = Math.round(size * (sharp ? 1 : 0.7) * 10) / 10;
  return { species: fish.name, kg: Math.max(0.1, kg), outcome: "landed" };
}

export type Trip = { catches: readonly Catch[] };
export const NEW_TRIP: Trip = { catches: [] };

export function addCatch(trip: Trip, c: Catch): Trip {
  return trip.catches.length >= CASTS
    ? trip
    : { catches: [...trip.catches, c] };
}

export function tripOver(trip: Trip): boolean {
  return trip.catches.length >= CASTS;
}

/** The trip's total, kg to a tenth. */
export function tripKg(trip: Trip): number {
  return Math.round(trip.catches.reduce((t, c) => t + c.kg, 0) * 10) / 10;
}
