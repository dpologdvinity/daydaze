// Cellar 214's pouring game: five glasses, each wine poured at its own
// speed. Hold to pour and let go on the line; how close the wine comes to it
// scores, and over the rim scores nothing. Pure: the client times the hold.

import { activeTier, byTier, type ContentTier } from "./age.ts";

export const GLASSES = 5;
/** The line, as a fraction of the glass, and the rim. */
export const LINE = 0.6;
export const RIM = 1;

/** The five pours of a flight: wines at 18+, sparkling juices at 13+. */
export const winesFor = (tier: ContentTier) => {
  const pick = <T>(adult: T, teen: T): T => byTier(adult, teen, tier);
  return [
    {
      name: pick("Sangiovese", "Concord grape"),
      color: "#6a0a1a",
      speed: 0.32,
    },
    {
      name: pick("Grüner Veltliner", "White grape"),
      color: "#e8d878",
      speed: 0.4,
    },
    {
      name: pick("Provence rosé", "Pink guava"),
      color: "#ff9ab0",
      speed: 0.36,
    },
    {
      name: pick("Orange skin-contact", "Blood orange"),
      color: "#e8902a",
      speed: 0.46,
    },
    { name: pick("Lambrusco", "Black cherry"), color: "#8a1a4a", speed: 0.52 },
  ] as const;
};

/** This client's five pours. */
export const WINES = winesFor(activeTier());

export type Pour = { level: number; points: number };

/** How full the glass is after `seconds` of pouring. */
export const levelAfter = (glass: number, seconds: number) =>
  Math.max(0, seconds) * (WINES[glass % WINES.length]?.speed ?? 0.4);

/** Points for a pour: 100 dead on the line, less the further off; nothing
 * once it's past the rim. */
export function pointsFor(level: number): number {
  if (level > RIM) return 0;
  return Math.max(0, Math.round(100 - Math.abs(level - LINE) * 400));
}

export type Flight = { pours: readonly Pour[] };
export const newFlight = (): Flight => ({ pours: [] });
export const flightOver = (f: Flight) => f.pours.length >= GLASSES;
export const flightScore = (f: Flight) =>
  f.pours.reduce((s, p) => s + p.points, 0);

export function pour(f: Flight, seconds: number): Flight {
  if (flightOver(f)) return f;
  const level = levelAfter(f.pours.length, seconds);
  return { pours: [...f.pours, { level, points: pointsFor(level) }] };
}
