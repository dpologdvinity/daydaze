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

export const sushi = createStore(OFF);

export const secondsIn = (now: number) => (now - sushi.get().start) / 1000;

export function start(now: number) {
  sushi.set({
    ...OFF,
    on: true,
    start: now,
    round: newRound(Math.floor(now) % 100_000),
  });
}

export function leave() {
  sushi.set(OFF);
}

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
