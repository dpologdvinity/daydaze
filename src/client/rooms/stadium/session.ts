import {
  goals,
  kick,
  NEW_SHOOTOUT,
  scoreKick,
  shootoutOver,
  type KickResult,
  type Shootout,
} from "../../../game/penalty.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";
import { crowd } from "../shared/Stands.tsx";

/**
 * A penalty shootout: five kicks at the keeper. A kick: press to start the
 * direction sweeping across the goal, press to lock it and start the
 * power, press to strike.
 */
export type Phase = "off" | "aim" | "power" | "flying" | "over";

const OFF = {
  phase: "off" as Phase,
  game: NEW_SHOOTOUT as Shootout,
  /** The keeper's seed for this shootout. */
  seed: 1,
  since: 0,
  direction: 0,
  kick: null as KickResult | null,
};

export const penalties = createStore(OFF);

/** The direction sweep, -1.2..1.2: across the goal and past both posts. */
export function directionAt(now: number, since: number): number {
  return Math.sin(((now - since) / 1000) * Math.PI * 0.9) * 1.2;
}

export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.4) * 0.5;
}

// a fresh keeper every shootout: the seed walks on from game to game
let keeperSeed = 12345;

export function start(now: number) {
  keeperSeed = (keeperSeed * 48271 + Math.floor(now)) % 2147483647;
  penalties.set({ ...OFF, phase: "aim", seed: keeperSeed, since: now });
}

export function leave() {
  penalties.set(OFF);
}

export function press(now: number) {
  const s = penalties.get();
  if (s.phase === "aim")
    penalties.set({
      phase: "power",
      direction: directionAt(now, s.since),
      since: now,
    });
  else if (s.phase === "power") {
    const result = kick(s.seed, s.game.results.length, {
      direction: s.direction,
      power: powerAt(now, s.since),
    });
    penalties.set({ phase: "flying", kick: result, since: now });
  } else if (s.phase === "over") start(now);
}

/** The scene calls this each frame: once the kick has played out, score it. */
export function tick(now: number) {
  const s = penalties.get();
  if (s.phase !== "flying" || !s.kick) return;
  if ((now - s.since) / 1000 < s.kick.frames.length / 30 + 0.9) return;
  const game = scoreKick(s.game, s.kick);
  if (s.kick.outcome === "goal") crowd.cheer = 1;
  if (shootoutOver(game)) award("penalties", goals(game));
  penalties.set({
    game,
    kick: null,
    phase: shootoutOver(game) ? "over" : "aim",
    since: now,
  });
}
