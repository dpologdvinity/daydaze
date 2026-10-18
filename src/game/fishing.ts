// Fishing off the marina dock: five casts. Set the cast's power, wait for
// the bobber to dip, and strike the moment it does. The further out the
// cast lands, the bigger the fish that can bite; a quick strike lands it
// whole, a slow one lets the big ones slip. Pure and deterministic: a cast's
// seed fixes when it bites and what's on the line.

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

export const SPECIES: readonly Species[] = [
  { name: "Sardine", kg: [0.1, 0.3], reach: 0, weight: 5 },
  { name: "Mackerel", kg: [0.5, 1.5], reach: 0, weight: 4 },
  { name: "Sea bass", kg: [1, 4], reach: 10, weight: 3 },
  { name: "Red snapper", kg: [2, 6], reach: 14, weight: 2.5 },
  { name: "Yellowtail", kg: [4, 10], reach: 18, weight: 1.5 },
  { name: "Sunset marlin", kg: [15, 40], reach: 22, weight: 0.4 },
];

function rand(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const clamp01 = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;

/** Where a cast with `power` (0..1) lands, meters out. */
export function castDistance(power: number): number {
  const p = clamp01(power);
  return CAST_RANGE[0] + (CAST_RANGE[1] - CAST_RANGE[0]) * p;
}

/** Seconds after the bobber lands until a fish bites. */
export function biteDelay(seed: number): number {
  return 1.6 + rand(seed) * 3.4;
}

/** What's on the line for a cast `distance` out. */
export function speciesFor(seed: number, distance: number): Species {
  const pool = SPECIES.filter((s) => distance >= s.reach);
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
): Catch {
  const fish = speciesFor(seed, distance);
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
