// Beach volleyball at the net on the city beach: first to seven against the
// pair across the net. Each time it comes over, dig it as it reaches you,
// then spike your setter's ball at the top. A perfect spike is a kill; a
// good one gets dug and comes back quicker; a mistimed dig or a spike into
// the net is their point. Swings grade like tennis (tennis.ts). Pure.
import type { Swing } from "./tennis.ts";

export const TO_WIN = 7;

export type Rally = {
  you: number;
  them: number;
  /** Times they've dug your spike in this point. */
  rally: number;
  /** What your next press does. */
  touch: "dig" | "spike";
};

export const NEW_RALLY: Rally = { you: 0, them: 0, rally: 0, touch: "dig" };

export type Outcome = "dug" | "rally" | "kill" | "lost";

/** Seconds until the ball is there to hit: their attack speeds up each time
 * they dig yours; the set always hangs the same. */
export function ballSeconds(m: Rally): number {
  return m.touch === "spike" ? 1 : Math.max(0.7, 1.4 - m.rally * 0.12);
}

export const matchOver = (m: Rally) => m.you >= TO_WIN || m.them >= TO_WIN;

export function play(
  m: Rally,
  swing: Swing,
): { match: Rally; outcome: Outcome } {
  if (matchOver(m)) return { match: m, outcome: "lost" };
  const miss = swing === "early" || swing === "late";
  if (miss)
    return {
      match: { ...m, them: m.them + 1, rally: 0, touch: "dig" },
      outcome: "lost",
    };
  if (m.touch === "dig")
    return { match: { ...m, touch: "spike" }, outcome: "dug" };
  if (swing === "perfect")
    return {
      match: { ...m, you: m.you + 1, rally: 0, touch: "dig" },
      outcome: "kill",
    };
  return {
    match: { ...m, rally: m.rally + 1, touch: "dig" },
    outcome: "rally",
  };
}
