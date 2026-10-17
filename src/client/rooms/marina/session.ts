import {
  addCatch,
  biteDelay,
  castDistance,
  HOOK_WINDOW,
  NEW_TRIP,
  strike,
  tripKg,
  tripOver,
  type Catch,
  type Trip,
} from "../../../game/fishing.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/**
 * Five casts off the end of the dock. Press to start the power sweeping,
 * press to cast; the bobber flies out and floats; when it dips, strike.
 * Striking before the dip spooks the fish.
 */
export type Phase =
  "off" | "power" | "flying" | "waiting" | "bite" | "result" | "over";

/** Seconds the bobber flies, and the catch shows before the next cast. */
export const FLIGHT = 1.1;
const SHOW = 2.4;

const OFF = {
  phase: "off" as Phase,
  trip: NEW_TRIP as Trip,
  /** performance.now() the current phase started. */
  since: 0,
  power: 0,
  distance: 0,
  seed: 0,
  /** performance.now() the fish bites. */
  biteAt: 0,
  last: null as Catch | null,
};

export const fishing = createStore(OFF);

export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 0.9) * 0.5;
}

export function start(now: number) {
  fishing.set({ ...OFF, phase: "power", since: now });
}

export function leave() {
  fishing.set(OFF);
}

function land(c: Catch, now: number) {
  const s = fishing.get();
  fishing.set({
    phase: "result",
    trip: addCatch(s.trip, c),
    last: c,
    since: now,
  });
}

/** `seen` is the phase the button showed when pressed: a press made on a
 * label the screen hadn't caught up from yet is dropped. */
export function press(now: number, seen?: Phase) {
  const s = fishing.get();
  if (seen !== undefined && seen !== s.phase) return;
  if (s.phase === "power") {
    const power = powerAt(now, s.since);
    fishing.set({
      phase: "flying",
      power,
      distance: castDistance(power),
      seed: Math.floor(Math.random() * 1e6),
      since: now,
    });
  } else if (s.phase === "waiting") land(strike(s.seed, s.distance, -1), now);
  else if (s.phase === "bite")
    land(strike(s.seed, s.distance, (now - s.biteAt) / 1000), now);
  else if (s.phase === "over") start(now);
}

/** The scene calls this each frame: land the bobber, bring the bite, let a
 * missed one go, and move on after each catch. */
export function tick(now: number) {
  const s = fishing.get();
  if (s.phase === "flying" && now - s.since >= FLIGHT * 1000)
    fishing.set({
      phase: "waiting",
      since: now,
      biteAt: now + biteDelay(s.seed) * 1000,
    });
  else if (s.phase === "waiting" && now >= s.biteAt)
    fishing.set({ phase: "bite", since: now });
  else if (s.phase === "bite" && now > s.biteAt + HOOK_WINDOW * 1000)
    land(strike(s.seed, s.distance, HOOK_WINDOW + 1), now);
  else if (s.phase === "result" && now - s.since >= SHOW * 1000) {
    if (tripOver(s.trip)) {
      award("fishing", tripKg(s.trip));
      fishing.set({ phase: "over", since: now });
    } else fishing.set({ phase: "power", since: now });
  }
}
