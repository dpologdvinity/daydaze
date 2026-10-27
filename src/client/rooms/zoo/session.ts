import {
  finalScore,
  HUNT_SECONDS,
  huntDone,
  newHunt,
  snap,
  SPECIES,
  type Hunt,
} from "../../../game/safari.ts";
import type { Species } from "../../../game/zoo.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { playClick } from "../../../audio/worldSounds.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** What the zoo scene saw last frame: its clock (the animals' time) and
 * where the player stands and faces. Written by the scene, read by Snap. */
export const zooView: { t: number; from: [number, number]; yaw: number } = {
  t: 0,
  from: [0, 0],
  yaw: 0,
};

/** Where each animal stands right now; every animal registers one entry and
 * keeps its `at` current, so a snap sees where they really are. */
export const zooAnimals = new Set<{ kind: Species; at: Vec2 }>();

const OFF = {
  on: false,
  start: 0,
  hunt: newHunt(1) as Hunt,
  last: null as string | null,
  over: false,
  /** The score the hunt ended on, time bonus and all. */
  final: 0,
};

export const safari = createStore(OFF);

export const secondsLeft = (now: number) =>
  HUNT_SECONDS - (now - safari.get().start) / 1000;

export function start(now: number) {
  safari.set({
    ...OFF,
    on: true,
    start: now,
    hunt: newHunt(Math.floor(now) % 100_000),
  });
}

export function leave() {
  safari.set(OFF);
}

const label = (id: string) => SPECIES.find((s) => s.id === id)?.label ?? id;

function finish(now: number, hunt: Hunt) {
  const final = finalScore(hunt, secondsLeft(now));
  safari.set({ over: true, final });
  award("safari", final);
}

export function press(now: number) {
  const s = safari.get();
  if (!s.on || s.over) return;
  playClick();
  const { hunt, got } = snap(s.hunt, zooView.from, zooView.yaw, [
    ...zooAnimals,
  ]);
  safari.set({
    hunt,
    last: got.length
      ? `Got it: ${got.map(label).join(" and ")}!`
      : "Nothing on your list in that shot. Face one and get closer.",
  });
  if (huntDone(hunt)) finish(now, hunt);
}

/** Ends the hunt when time runs out, once. */
export function tick(now: number) {
  const s = safari.get();
  if (s.on && !s.over && secondsLeft(now) <= 0) finish(now, s.hunt);
}
