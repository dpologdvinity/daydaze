// The speed slide race at the Water Park: two flumes side by side, you
// against a rival. Tuck as you hit each bend: on time cuts the corner, early
// or late scrubs speed. Lowest time wins. Swings grade like tennis
// (tennis.ts). Times are in tenths of a second. Pure.
import type { Swing } from "./tennis.ts";

export const BENDS = 6;
/** The run with no tucks at all, in tenths. */
const BASE = 120;
const ADJUST: Record<Swing, number> = {
  perfect: -5,
  good: -3,
  early: 3,
  late: 3,
};

/** Seconds from the push-off to bend `i`. */
export const bendAt = (i: number) => 1.2 + i * 1.1;

export type Run = readonly Swing[];

export const runOver = (r: Run) => r.length >= BENDS;

export function tuck(r: Run, swing: Swing): Run {
  return runOver(r) ? r : [...r, swing];
}

export const finishTenths = (r: Run) =>
  BASE + r.reduce((t, s) => t + ADJUST[s], 0);

/** The rival's time for a race seed: quick, but beatable with good tucks. */
export function rivalTenths(seed: number): number {
  const h = Math.imul(seed ^ 0x2c1b3c6d, 0x297a2d39) >>> 0;
  return 98 + (h % 12);
}
