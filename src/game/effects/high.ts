// The 18+ lounge's two meters, next to the buzz: `high` (weed) and `trip`
// (shrooms). Pure functions only; the client keeps the numbers and draws the
// effects. Nothing here reaches real players until the age gate ships.

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

const HITS = { joint: 0.35, edible: 0.55 } as const;
export type Hit = keyof typeof HITS;

/** A shroom tea's dose. */
const TEA = 0.45;

/** Time constants: a high fades in about five minutes, a trip in eight. */
export const HIGH_DECAY_SECONDS = 110;
export const TRIP_DECAY_SECONDS = 170;

export function addHit(level: number, hit: Hit): number {
  return Math.min(1, clamp01(level) + HITS[hit]);
}

export function addTea(level: number): number {
  return Math.min(1, clamp01(level) + TEA);
}

export function decay(level: number, seconds: number, tau: number): number {
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return clamp01(level) * Math.exp(-dt / tau);
}

export type HighLook = {
  /** Soft glow and lifted saturation, 0..1. Kept under reduced motion. */
  glow: number;
  /** How far colors cycle round the hue wheel, 0..1. Kept, but frozen,
   * under reduced motion. */
  hue: number;
  /** Surfaces breathing: a slow radial swell of the screen, in UVs. Zero
   * under reduced motion. Under 0.3 Hz, never a strobe. */
  breathe: number;
  /** 1 while the colors drift on their own, 0 (held still) under reduced
   * motion. */
  drift: number;
};

export const BREATHE_AMOUNT = 0.006;
export const BREATHE_HZ = 0.25;

/** The high and trip visuals for the setting's intensity factor (0..1). */
export function highParams(
  high: number,
  trip: number,
  factor: number,
  calm: boolean,
): HighLook {
  const f = clamp01(factor);
  const h = clamp01(high) * f;
  const t = clamp01(trip) * f;
  return {
    glow: Math.min(1, h * 0.8 + t * 0.4),
    hue: t,
    breathe: calm ? 0 : t * BREATHE_AMOUNT,
    drift: calm ? 0 : 1,
  };
}
