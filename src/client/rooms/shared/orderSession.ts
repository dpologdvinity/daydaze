import {
  dump,
  newShift,
  pour,
  score,
  serve,
  shiftOver,
  ticket,
  type Shift,
  type Station,
} from "../../../game/orders.ts";
import type { PrizeGame } from "../../../game/prizes.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "./store.ts";

/** A shift at an order station (the espresso bar, the boba bar): tickets one
 * at a time, the clock on each for the tip, a prize at the end. */
export function createOrderSession(station: Station, prize: PrizeGame) {
  const OFF = {
    on: false,
    shift: newShift(0) as Shift,
    /** performance.now() the current ticket came in. */
    since: 0,
    last: null as { name: string; right: boolean; tip: number } | null,
  };
  const store = createStore(OFF);
  const update = (shift: Shift) => store.set({ ...store.get(), shift });
  return {
    station,
    store,
    start(now: number) {
      store.set({
        on: true,
        shift: newShift(Math.floor(Math.random() * 1e6)),
        since: now,
        last: null,
      });
    },
    leave: () => store.set(OFF),
    add: (what: string) => update(pour(station, store.get().shift, what)),
    empty: () => update(dump(store.get().shift)),
    handOver(now: number) {
      const s = store.get();
      if (!s.on || shiftOver(s.shift)) return;
      const name = ticket(station, s.shift.seed, s.shift.served).name;
      const r = serve(station, s.shift, (now - s.since) / 1000);
      store.set({ ...s, shift: r.shift, since: now, last: { name, ...r } });
      if (shiftOver(r.shift)) award(prize, score(r.shift));
    },
  };
}

export type OrderSession = ReturnType<typeof createOrderSession>;
