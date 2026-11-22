// Wanted level: crimes add heat, stars come from heat, heat cools off out of
// sight (faster when hiding), getting caught means jail, bail reuses jail.
// Pure state transitions; no React or three.js, and nothing saved here.
import {
  DEFAULT_JAIL,
  bailOut,
  sentence,
  type JailSave,
} from "../jail/jail.ts";
import { isRecord } from "../typed.ts";
import type { Vec2 } from "../walk.ts";

export const MAX_STARS = 5;

/** Heat needed to hold each star; index is the star count. */
export const STAR_HEAT: readonly number[] = [0, 10, 30, 60, 100, 150];
export const MAX_HEAT = STAR_HEAT[MAX_STARS];

export type CrimeKind =
  "shoplift" | "streetFight" | "pedestrianHit" | "hitAndRun" | "heist";

/** Heat a crime adds and the Street-ladder XP it is worth. */
export const CRIMES: Readonly<Record<CrimeKind, { heat: number; xp: number }>> =
  {
    shoplift: { heat: 30, xp: 5 },
    streetFight: { heat: 20, xp: 10 },
    // knocking someone down with your car (game/city/carHits.ts); driving off
    // after adds a hitAndRun on top
    pedestrianHit: { heat: 12, xp: 0 },
    hitAndRun: { heat: 35, xp: 15 },
    heist: { heat: 110, xp: 50 },
  };

/** Street-ladder XP for escaping, by the stars you had. Index 0 is unused. */
export const ESCAPE_XP: readonly number[] = [0, 10, 25, 50, 90, 150];

export type WantedState = {
  heat: number;
  /** Milliseconds out of the police's sight since the last sighting or crime. */
  unseenMs: number;
  /** Milliseconds spent hiding in that stretch. */
  hidingMs: number;
  /** Stars at the last sighting or crime; an escape pays for these. */
  peak: number;
};

export const NOT_WANTED: WantedState = {
  heat: 0,
  unseenMs: 0,
  hidingMs: 0,
  peak: 0,
};

export function starsOf(state: WantedState): number {
  let stars = 0;
  for (let s = 1; s <= MAX_STARS; s++) {
    if (state.heat >= STAR_HEAT[s]) stars = s;
  }
  return stars;
}

export function commitCrime(
  state: WantedState,
  kind: CrimeKind,
): { state: WantedState; xp: number } {
  const { heat, xp } = CRIMES[kind];
  const next = Math.min(MAX_HEAT, state.heat + heat);
  const peak = starsOf({ ...state, heat: next });
  return { state: { heat: next, unseenMs: 0, hidingMs: 0, peak }, xp };
}

/** Out of sight this long before the heat starts to drop. */
export const SEARCH_GRACE_MS = 8000;
/** Heat lost per second once the search is over, and the hiding multiplier. */
export const COOL_PER_SECOND = 1;
export const HIDING_COOL_FACTOR = 4;
/** Hiding only counts for cooling once it has gone on this long. */
export const HIDING_SETTLE_MS = 3000;

export type Sighting = { inSight: boolean; hiding: boolean };

/** One tick. `escape` is set on the tick the last star drops, clearing the heat. */
export function stepWanted(
  state: WantedState,
  dtMs: number,
  sighting: Sighting,
): { state: WantedState; escape: { stars: number; xp: number } | null } {
  if (state.heat <= 0 || !Number.isFinite(dtMs) || dtMs <= 0) {
    return { state: state.heat <= 0 ? NOT_WANTED : state, escape: null };
  }
  if (sighting.inSight) {
    return {
      state: { ...state, unseenMs: 0, hidingMs: 0, peak: starsOf(state) },
      escape: null,
    };
  }
  const unseenMs = state.unseenMs + dtMs;
  const hidingMs = sighting.hiding ? state.hidingMs + dtMs : 0;
  // Only the time past the grace period cools, so a long tick is not a freebie.
  const coolingMs = Math.min(dtMs, Math.max(0, unseenMs - SEARCH_GRACE_MS));
  const hideFactor = hidingMs >= HIDING_SETTLE_MS ? HIDING_COOL_FACTOR : 1;
  const heat = Math.max(
    0,
    state.heat - (coolingMs / 1000) * COOL_PER_SECOND * hideFactor,
  );
  if (starsOf({ ...state, heat }) === 0) {
    const stars = state.peak;
    return { state: NOT_WANTED, escape: { stars, xp: ESCAPE_XP[stars] } };
  }
  return { state: { ...state, heat, unseenMs, hidingMs }, escape: null };
}

/** What the city sends after a player at each star count. Distances in meters. */
export type PoliceResponse = {
  officers: number;
  cars: number;
  roadblocks: number;
  helicopters: number;
  /** How far an officer sees you. */
  sightRadius: number;
};

export const RESPONSES: readonly PoliceResponse[] = [
  { officers: 0, cars: 0, roadblocks: 0, helicopters: 0, sightRadius: 0 },
  { officers: 1, cars: 0, roadblocks: 0, helicopters: 0, sightRadius: 20 },
  { officers: 2, cars: 1, roadblocks: 0, helicopters: 0, sightRadius: 28 },
  { officers: 3, cars: 2, roadblocks: 1, helicopters: 0, sightRadius: 36 },
  { officers: 4, cars: 3, roadblocks: 2, helicopters: 1, sightRadius: 48 },
  { officers: 6, cars: 4, roadblocks: 3, helicopters: 2, sightRadius: 60 },
];

export function responseFor(stars: number): PoliceResponse {
  if (!Number.isFinite(stars)) return RESPONSES[0];
  const clamped = Math.min(MAX_STARS, Math.max(0, Math.floor(stars)));
  return RESPONSES[clamped];
}

/** Minutes in jail by stars at the arrest; the top is jail's own cap. */
export const JAIL_MINUTES: readonly number[] = [0, 2, 4, 7, 10, 15];

/** Caught: the stars clear, and any star means a sentence. */
export function arrest(
  state: WantedState,
  now: number,
): { wanted: WantedState; jail: JailSave } {
  const stars = starsOf(state);
  return {
    wanted: NOT_WANTED,
    jail: stars === 0 ? DEFAULT_JAIL : sentence(now, JAIL_MINUTES[stars]),
  };
}

/** Bail is the jail module's; null when the player cannot afford it. */
export function payBail(
  jail: JailSave,
  now: number,
  coins: number,
): { jail: JailSave; coins: number } | null {
  return bailOut(jail, now, coins);
}

const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

const clean = (value: unknown, max: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, max)
    : 0;

// Saved wanted state is untrusted: finite, non-negative and capped.
export function validateWanted(value: unknown): WantedState {
  if (!isRecord(value)) return NOT_WANTED;
  const { heat, unseenMs, hidingMs } = value;
  const h = clean(heat, MAX_HEAT);
  if (h === 0) return NOT_WANTED;
  return {
    heat: h,
    peak: starsOf({ ...NOT_WANTED, heat: h }),
    unseenMs: clean(unseenMs, MAX_TIMER_MS),
    hidingMs: clean(hidingMs, MAX_TIMER_MS),
  };
}

export const CAPTURE_MS = 3000;

/** Accumulate time boxed in by a cruiser. On foot an officer catches on contact. */
export function captureTime(
  elapsedMs: number,
  dtMs: number,
  distance: number,
  drivingSpeed: number | null,
  inSight: boolean,
): number {
  if (!inSight) return 0;
  if (drivingSpeed === null) return distance <= 2.5 ? CAPTURE_MS : 0;
  if (distance > 3.5 || Math.abs(drivingSpeed) >= 1) return 0;
  return Math.min(CAPTURE_MS, elapsedMs + dtMs);
}

/** A sight line is blocked by any solid footprint it enters or starts in. */
export function hasPoliceSight(
  from: Vec2,
  to: Vec2,
  blockers: readonly (readonly Vec2[])[],
): boolean {
  const [x, z] = from;
  const dx = to[0] - x;
  const dz = to[1] - z;
  const maxX = Math.max(x, to[0]);
  const minX = Math.min(x, to[0]);
  const maxZ = Math.max(z, to[1]);
  const minZ = Math.min(z, to[1]);
  for (const polygon of blockers) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[j];
      const [bx, bz] = polygon[i];
      if (az > z !== bz > z && x < ax + ((bx - ax) * (z - az)) / (bz - az))
        inside = !inside;
      if (
        Math.min(ax, bx) > maxX ||
        Math.max(ax, bx) < minX ||
        Math.min(az, bz) > maxZ ||
        Math.max(az, bz) < minZ
      )
        continue;
      const acrossA = dx * (az - z) - dz * (ax - x);
      const acrossB = dx * (bz - z) - dz * (bx - x);
      const acrossFrom = (bx - ax) * (z - az) - (bz - az) * (x - ax);
      const acrossTo = (bx - ax) * (to[1] - az) - (bz - az) * (to[0] - ax);
      if (acrossA * acrossB <= 0 && acrossFrom * acrossTo <= 0) return false;
    }
    if (inside) return false;
  }
  return true;
}
