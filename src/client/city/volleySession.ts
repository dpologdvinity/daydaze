import {
  ballSeconds,
  matchOver,
  NEW_RALLY,
  play,
  type Outcome,
  type Rally,
} from "../../game/volleyball.ts";
import { gradeSwing, type Swing } from "../../game/tennis.ts";
import type { PrizeGame } from "../../game/prizes.ts";
import { award } from "../ui/prizeDesk.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Beach volleyball at the city net (volleyball.ts): the ball comes over,
 * you dig it as it reaches you, then spike the set at its top. */
export type Phase = "off" | "incoming" | "away" | "between" | "over";

/** Seconds your spike takes to land or be dug, and the pause between points. */
const AWAY = 0.9;
const BETWEEN = 1.4;

const OFF = {
  phase: "off" as Phase,
  match: NEW_RALLY as Rally,
  since: 0,
  /** performance.now() the ball is there to hit. */
  arrives: 0,
  last: null as { swing: Swing; outcome: Outcome } | null,
  /** Which court: the beach net or the pool. */
  prize: "volleyball" as PrizeGame,
};

export const volley = createStore(OFF);

function feed(now: number, match: Rally) {
  volley.set({
    phase: "incoming",
    match,
    since: now,
    arrives: now + ballSeconds(match) * 1000,
  });
}

export function start(now: number, prize: PrizeGame = volley.get().prize) {
  volley.set({ ...OFF, prize });
  feed(now, NEW_RALLY);
}

export const leave = () => volley.set(OFF);

function hit(now: number, s: Swing) {
  const { match, outcome } = play(volley.get().match, s);
  const last = { swing: s, outcome };
  if (outcome === "dug") {
    // your setter puts it up for the spike
    volley.set({ last });
    feed(now, match);
  } else if (outcome === "rally")
    volley.set({ phase: "away", match, since: now, last });
  else volley.set({ phase: "between", match, since: now, last });
}

/** `seen` is the phase the button showed, so a stale press is dropped. */
export function press(now: number, seen?: Phase) {
  const s = volley.get();
  if (seen !== undefined && seen !== s.phase) return;
  if (s.phase === "incoming") hit(now, gradeSwing((now - s.arrives) / 1000));
  else if (s.phase === "over") start(now);
}

/** Called every frame while playing: a ball nobody touched drops, a dug
 * spike comes back, and the next point is served. */
export function tick(now: number) {
  const s = volley.get();
  if (s.phase === "incoming" && now - s.arrives > 400) hit(now, "late");
  else if (s.phase === "away" && now - s.since >= AWAY * 1000)
    feed(now, s.match);
  else if (s.phase === "between" && now - s.since >= BETWEEN * 1000) {
    if (matchOver(s.match)) {
      award(s.prize, s.match.you);
      volley.set({ phase: "over", since: now });
    } else feed(now, s.match);
  }
}
