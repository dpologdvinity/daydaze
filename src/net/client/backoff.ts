export const BASE_DELAY_MS = 1000;
export const MAX_DELAY_MS = 15_000;

/** Reconnect delay: 1 s, 2 s, 4 s ... up to 15 s, each ±20% so clients spread out. */
export function nextDelay(attempt: number, random: () => number): number {
  const step = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 30;
  const base = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.min(step, 30));
  const unit = Math.min(1, Math.max(0, random())) || 0;
  return Math.round(Math.min(MAX_DELAY_MS, base * (0.8 + 0.4 * unit)));
}
