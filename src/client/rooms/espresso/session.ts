import {
  dump,
  newShift,
  pour,
  score,
  serve,
  shiftOver,
  ticket,
  type Ingredient,
  type Shift,
} from "../../../game/barista.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A barista shift at Espresso Lab: tickets one at a time, the clock on each
 * for the tip. */
const OFF = {
  on: false,
  shift: newShift(0),
  /** performance.now() the current ticket came in. */
  since: 0,
  last: null as { name: string; right: boolean; tip: number } | null,
};

export const barista = createStore(OFF);

export function start(now: number) {
  barista.set({
    on: true,
    shift: newShift(Math.floor(Math.random() * 1e6)),
    since: now,
    last: null,
  });
}

export function leave() {
  barista.set(OFF);
}

function update(shift: Shift) {
  barista.set({ ...barista.get(), shift });
}

export const add = (what: Ingredient) =>
  update(pour(barista.get().shift, what));
export const empty = () => update(dump(barista.get().shift));

export function handOver(now: number) {
  const s = barista.get();
  if (!s.on || shiftOver(s.shift)) return;
  const name = ticket(s.shift.seed, s.shift.served).name;
  const r = serve(s.shift, (now - s.since) / 1000);
  barista.set({ ...s, shift: r.shift, since: now, last: { name, ...r } });
  if (shiftOver(r.shift)) award("barista", score(r.shift));
}
