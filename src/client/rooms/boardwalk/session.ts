import {
  aimAt,
  gameOver,
  landing,
  newGame,
  powerAt,
  roll,
  total,
  type Game,
  type Ring,
} from "../../../game/skeeBall.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A Skee-Ball game: stop the aim, stop the power, watch it roll. */
export type Phase = "off" | "aim" | "power" | "rolling" | "over";
/** Seconds a ball takes up the lane. */
export const ROLL_TIME = 1.3;

const OFF = {
  phase: "off" as Phase,
  game: newGame() as Game,
  /** performance.now() the phase began. */
  since: 0,
  aim: 0,
  power: 0,
  last: null as Ring | null,
};

export const skee = createStore(OFF);

export function start(now: number) {
  skee.set({ ...OFF, phase: "aim", since: now });
}

export function leave() {
  skee.set(OFF);
}

const secs = (now: number) => (now - skee.get().since) / 1000;
export const aimNow = (now: number) => aimAt(secs(now));
export const powerNow = (now: number) => powerAt(secs(now));

/** `seen` is the phase the button showed: a press on a stale label drops. */
export function press(now: number, seen?: Phase) {
  const s = skee.get();
  if (seen !== undefined && seen !== s.phase) return;
  if (s.phase === "aim")
    skee.set({ phase: "power", aim: aimNow(now), since: now });
  else if (s.phase === "power") {
    const power = powerNow(now);
    skee.set({
      phase: "rolling",
      power,
      last: landing(s.aim, power),
      game: roll(s.game, s.aim, power),
      since: now,
    });
  }
}

/** Ends a roll once the ball has had its time on the lane. */
export function tick(now: number) {
  const s = skee.get();
  if (s.phase !== "rolling" || secs(now) < ROLL_TIME) return;
  if (gameOver(s.game)) {
    skee.set({ phase: "over", since: now });
    award("skee-ball", total(s.game));
  } else skee.set({ phase: "aim", since: now });
}
