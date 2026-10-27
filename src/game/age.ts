// The age line. The main world is 13+ (the "teen" tier); alcohol, drunk
// effects, drugs and the 18+ rooms belong to the "adult" tier, which only
// separate 18+ servers will run, and must not reach real players before the
// server-side age check ships (roadmap M10). Until then the client only
// opens the adult tier in a development build, with ?adult=1.
//
// Every tier decision goes through `allows` / `byTier`; do not test the flag
// or write alcohol checks anywhere else.
import type { RoomId } from "./rooms.ts";

export const ADULT_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>(["green-haze"]);

/** Whether `room` may be entered: everything but the 18+ rooms, which need
 * `adultOk` (the age check, or a development build's flag). */
export function mayEnter(room: RoomId, adultOk: boolean): boolean {
  return adultOk || !ADULT_ROOMS.has(room);
}

/** The content rating a client runs at: 13+ ("teen") or 18+ ("adult"). */
export type ContentTier = "teen" | "adult";

/** Things that exist only at the adult tier. */
export type Feature = "alcohol" | "drugs" | "adult-venues";

/** The tier for an `adultOk` flag (the age check, or a development build's). */
export function contentTier(adultOk: boolean): ContentTier {
  return adultOk ? "adult" : "teen";
}

/** The lowest tier each feature appears at; all are adult-only today. */
const MIN_TIER: Record<Feature, ContentTier> = {
  alcohol: "adult",
  drugs: "adult",
  "adult-venues": "adult",
};

/** Whether `tier` may show `feature`. */
export function allows(tier: ContentTier, feature: Feature): boolean {
  return MIN_TIER[feature] === "teen" || tier === "adult";
}

// The tier this client runs at, set once at startup (client/adult.ts) before
// any module that builds tier-dependent data loads. Teen until told otherwise.
// IMPORT ORDER MATTERS: modules that call byTier/activeTier at load time (the
// food menus, the wine flight, the shelf labels, layout signs) read this
// value once, so every entry point must import client/adult.ts before them
// (main.tsx and minigames/fixture.tsx do). Prefer the *For(tier) builders.
let active: ContentTier = "teen";

export function setActiveTier(tier: ContentTier): void {
  active = tier;
}

export function activeTier(): ContentTier {
  return active;
}

/** `adult` at the adult tier, `teen` otherwise (default: the active tier). */
export function byTier<T>(adult: T, teen: T, tier: ContentTier = active): T {
  return tier === "adult" ? adult : teen;
}
