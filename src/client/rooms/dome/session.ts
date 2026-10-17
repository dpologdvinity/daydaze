import {
  AIM_LIMIT,
  GAME_SECONDS,
  NEW_SHOOTOUT,
  scoreShot,
  shoot,
  spotFor,
  type ShotKind,
  type ShotResult,
  type Shootout,
} from "../../../game/hoops.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";
import { crowd } from "../shared/Stands.tsx";

/**
 * A Hot Shots game: sixty seconds to score from the spots round the hoop.
 * A shot: press to start the aim sweeping, press to lock it and start the
 * power, press to shoot.
 */
export type Phase = "off" | "aim" | "power" | "flying" | "over";

const OFF = {
  phase: "off" as Phase,
  game: NEW_SHOOTOUT as Shootout,
  /** performance.now() when the clock runs out. */
  endsAt: 0,
  /** When the current sweep, or the shot's flight, started. */
  since: 0,
  aim: 0,
  shot: null as ShotResult | null,
  last: null as ShotKind | null,
};

export const hoops = createStore(OFF);

export function aimAt(now: number, since: number): number {
  return Math.sin(((now - since) / 1000) * Math.PI * 1.2) * AIM_LIMIT * 0.9;
}

export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.5) * 0.5;
}

/** Seconds left on the clock at `now`. */
export function timeLeft(now: number): number {
  const s = hoops.get();
  return s.phase === "off"
    ? GAME_SECONDS
    : Math.max(0, (s.endsAt - now) / 1000);
}

export function start(now: number) {
  hoops.set({
    ...OFF,
    phase: "aim",
    endsAt: now + GAME_SECONDS * 1000,
    since: now,
  });
}

export function leave() {
  hoops.set(OFF);
}

export function press(now: number) {
  const s = hoops.get();
  if (s.phase === "aim")
    hoops.set({ phase: "power", aim: aimAt(now, s.since), since: now });
  else if (s.phase === "power") {
    const shot = shoot(spotFor(s.game).at, {
      aim: s.aim,
      power: powerAt(now, s.since),
    });
    hoops.set({ phase: "flying", shot, since: now });
  } else if (s.phase === "over") start(now);
}

/** The scene calls this each frame: score a landed shot, run the clock. */
export function tick(now: number) {
  const s = hoops.get();
  if (s.phase === "flying" && s.shot) {
    const flight = s.shot.frames.length / 30;
    if ((now - s.since) / 1000 < flight + 0.4) return;
    const game = scoreShot(s.game, s.shot);
    if (s.shot.made) crowd.cheer = s.shot.kind === "swish" ? 1 : 0.7;
    const over = now >= s.endsAt;
    if (over) award("hoops", game.points);
    hoops.set({
      game,
      shot: null,
      last: s.shot.kind,
      phase: over ? "over" : "aim",
      since: now,
    });
  } else if ((s.phase === "aim" || s.phase === "power") && now >= s.endsAt) {
    award("hoops", s.game.points);
    hoops.set({ phase: "over" });
  }
}
