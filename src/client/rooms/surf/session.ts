import {
  newRide,
  step,
  surfScore,
  trick,
  type Surf,
} from "../../../game/surf.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A ride at Swell Surf Co.: the board's state, which way she's leaning
 * (held buttons or arrow keys) and when a trick last landed. */
const OFF = {
  on: false,
  surf: newRide(0) as Surf,
  lean: 0 as -1 | 0 | 1,
  trickAt: -Infinity,
};

export const surfing = createStore(OFF);

export function start() {
  surfing.set({
    on: true,
    surf: newRide(Math.floor(Math.random() * 1e6)),
    lean: 0,
    trickAt: -Infinity,
  });
}

export function leave() {
  surfing.set(OFF);
}

export const setLean = (lean: -1 | 0 | 1) => surfing.set({ lean });

export function tryTrick(now: number) {
  const s = surfing.get();
  if (!s.on) return;
  const r = trick(s.surf);
  if (r.landed) surfing.set({ surf: r.surf, trickAt: now });
}

/** Advances the ride a frame; pays out once when it ends. */
export function tick(dt: number) {
  const s = surfing.get();
  if (!s.on || s.surf.state !== "riding") return;
  const surf = step(s.surf, s.lean, dt);
  surfing.set({ surf });
  if (surf.state !== "riding") award("surf", surfScore(surf));
}
