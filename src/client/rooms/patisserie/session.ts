import {
  drop,
  newTower,
  sliderAt,
  towerScore,
  type Tower,
} from "../../../game/macaronTower.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A macaron tower at Sucre's stand: each macaron sweeps from when the last
 * one landed (`since`, performance.now()). */
const OFF = {
  on: false,
  tower: newTower() as Tower,
  since: 0,
  perfect: false,
};

export const tower = createStore(OFF);

export function start(now: number) {
  tower.set({ on: true, tower: newTower(), since: now, perfect: false });
}

export function leave() {
  tower.set(OFF);
}

/** Where the sliding macaron is now, in tower units. */
export function sliderNow(now: number): number {
  const s = tower.get();
  return sliderAt(s.tower, (now - s.since) / 1000);
}

export function press(now: number) {
  const s = tower.get();
  if (!s.on || s.tower.over) return;
  const r = drop(s.tower, sliderNow(now));
  tower.set({ tower: r.tower, since: now, perfect: r.perfect });
  if (r.tower.over) award("macaron-tower", towerScore(r.tower));
}
