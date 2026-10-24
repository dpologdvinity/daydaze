// Sushi Catch's round state: a store with the round, its start time and the
// last grab, and the actions that start, grab, tick and leave. Times are
// performance.now() milliseconds; the round itself counts seconds. The score
// goes to the prize desk once, when time runs out.

import {
  grab,
  newRound,
  PLATES,
  roundOver,
  type Round,
} from "../../../game/sushiCatch.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

const OFF = {
  on: false,
  /** performance.now() the round began. */
  start: 0,
  round: newRound(0) as Round,
  /** What the last grab got, for the call line. */
  last: null as { label: string; right: boolean } | null,
  over: false,
};

/**
 * The Sushi Catch store: whether a round is on or over, its start time, the
 * round and the last grab.
 */
export const sushi = createStore(OFF);

/** Seconds since the current round started, for a performance.now() time. */
export const secondsIn = (now: number) => (now - sushi.get().start) / 1000;

/** Starts a fresh round at `now`, seeded from the clock. */
export function start(now: number) {
  sushi.set({
    ...OFF,
    on: true,
    start: now,
    round: newRound(Math.floor(now) % 100_000),
  });
}

/** Ends the round without scoring it. */
export function leave() {
  sushi.set(OFF);
}

/**
 * Grabs whatever plate is in reach at `now`. Does nothing when the round is off
 * or over, or nothing is in reach.
 */
export function press(now: number) {
  const s = sushi.get();
  if (!s.on || s.over) return;
  const g = grab(s.round, secondsIn(now));
  if (!g.got) return;
  const label = PLATES.find((p) => p.id === g.got)?.label ?? g.got;
  sushi.set({ round: g.round, last: { label, right: g.right } });
}

/** Ends the round when the clock runs out, once. */
export function tick(now: number) {
  const s = sushi.get();
  if (!s.on || s.over || !roundOver(secondsIn(now))) return;
  sushi.set({ over: true });
  award("sushi", s.round.score);
}
