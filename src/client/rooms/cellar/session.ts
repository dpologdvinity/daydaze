import {
  flightOver,
  flightScore,
  levelAfter,
  newFlight,
  pour,
  type Flight,
} from "../../../game/winePour.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A flight at Cellar 214: `pouring` is when the current hold began
 * (performance.now()), or null between pours. */
const OFF = {
  on: false,
  flight: newFlight() as Flight,
  pouring: null as number | null,
};

export const cellar = createStore(OFF);

export const start = () =>
  cellar.set({ on: true, flight: newFlight(), pouring: null });
export const leave = () => cellar.set(OFF);

export function hold(now: number) {
  const s = cellar.get();
  if (!s.on || flightOver(s.flight) || s.pouring !== null) return;
  cellar.set({ pouring: now });
}

export function release(now: number) {
  const s = cellar.get();
  if (s.pouring === null) return;
  const flight = pour(s.flight, (now - s.pouring) / 1000);
  cellar.set({ flight, pouring: null });
  if (flightOver(flight)) award("wine-pour", flightScore(flight));
}

/** How full the current glass is right now. */
export function levelNow(now: number): number {
  const s = cellar.get();
  if (s.pouring === null) return 0;
  return levelAfter(s.flight.pours.length, (now - s.pouring) / 1000);
}
