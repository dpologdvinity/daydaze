// The haunted escape's session: the pure run (hauntedRun.ts) with the beats
// the room plays: you choose a door, walk to it, and it either lets you
// through (the hall fades and is dressed as the next room) or plays a scare
// (hauntedSets.ts) before you turn back.

import {
  newRun,
  open,
  runOver,
  runScore,
  type Run,
} from "../../../game/hauntedRun.ts";
import { scareFor, type ScareKind } from "../../../game/hauntedSets.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** Off, choosing a door, walking to it, a scare, going through, done. */
export type Phase = "off" | "choose" | "walk" | "scare" | "through" | "over";

/** Seconds for the walk to a door, a scare, and the fade through. */
export const WALK = 1.2;
export const SCARE = 2.4;
export const THROUGH = 1;

const OFF = {
  phase: "off" as Phase,
  run: newRun(1) as Run,
  /** The door picked (0 left, 1 ahead, 2 right). */
  door: 1,
  /** performance.now() the phase began. */
  since: 0,
  scare: null as { kind: ScareKind; line: string } | null,
};

export const escape = createStore(OFF);

export function start(now: number) {
  escape.set({
    ...OFF,
    phase: "choose",
    run: newRun(Math.floor(Math.random() * 1e9)),
    since: now,
  });
}

export const leave = () => escape.set(OFF);

/** Picks a door: she walks to it. */
export function pick(door: number, now: number) {
  if (escape.get().phase === "choose")
    escape.set({ phase: "walk", door, since: now, scare: null });
}

/** Moves the beats on: the door opens at the end of the walk. */
export function tick(now: number) {
  const s = escape.get();
  const t = (now - s.since) / 1000;
  if (s.phase === "walk" && t >= WALK) {
    const r = open(s.run, s.door);
    if (r.scared) {
      const scare = scareFor(s.run.seed, s.run.depth, s.run.nerve);
      escape.set({ phase: "scare", run: r.run, since: now, scare });
    } else escape.set({ phase: "through", run: r.run, since: now });
  } else if (
    (s.phase === "scare" && t >= SCARE) ||
    (s.phase === "through" && t >= THROUGH)
  ) {
    if (runOver(s.run)) {
      escape.set({ phase: "over", since: now });
      award("haunted", runScore(s.run));
    } else escape.set({ phase: "choose", since: now });
  }
}
