// The dive's live state, shared by the reef scene (which fills it in every
// few ticks) and the dive panel (which shows it): air, depth, what she has
// spotted. Pure rules come from src/game/dive.ts; the score goes to the prize
// desk once, when the dive ends.

import {
  AIR_SECONDS,
  NEW_LOG,
  exploreWreck,
  scoreOf,
  spot,
  speciesLabel,
  type Log,
  type SpeciesId,
} from "../../../game/dive.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

export const dive = createStore({
  /** True from the moment the reef loads until she surfaces. */
  on: false,
  air: AIR_SECONDS,
  depth: 0,
  log: NEW_LOG as Log,
  /** The last thing she found, for the panel's call-out. */
  last: "",
  /** Set when the tank ran dry: the scene brings her up. */
  out: false,
});

/** A fresh tank and an empty log: she has just gone down. */
export function startDive() {
  dive.set({
    on: true,
    air: AIR_SECONDS,
    depth: 0,
    log: NEW_LOG,
    last: "",
    out: false,
  });
}

/** Per-tick readings from the scene. */
export function readings(air: number, depth: number) {
  dive.set({ air, depth, out: air <= 0 });
}

/** She has seen `id`: counted once, with a call-out the first time. */
export function sighted(id: SpeciesId) {
  const s = dive.get();
  const log = spot(s.log, id);
  if (log === s.log) return;
  dive.set({ log, last: `Spotted: ${speciesLabel(id)}!` });
}

/** She has swum into the wreck's zone. */
export function wreckFound() {
  const s = dive.get();
  const log = exploreWreck(s.log);
  if (log === s.log) return;
  dive.set({ log, last: "You found the wreck!" });
}

/** She is back up: pay the dive's score (if she found anything) and reset. */
export function endDive() {
  const s = dive.get();
  if (!s.on) return;
  const score = scoreOf(s.log);
  if (score > 0) award("reef-dive", score);
  dive.set({ on: false, depth: 0 });
}
