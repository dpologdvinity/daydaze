// Beach (and pool) volleyball's match session: the pure rally engine
// (volleyball.ts) on a clock, plus the ball's current flight, so the court
// scene (VolleyCourt.tsx) can draw every touch while the panel keeps score.
import {
  ballSeconds,
  matchOver,
  NEW_RALLY,
  play,
  type Outcome,
  type Rally,
  type Shot,
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
  last: null as {
    swing: Swing;
    outcome: Outcome;
    /** Which touch it was. */
    touch: Rally["touch"];
  } | null,
  /** The ball's flight now: the shot, its lane across the court (-1..1),
   * performance.now() it was hit and its seconds in the air; `n` counts
   * flights, so a scene can tell a new one from the last. */
  flight: null as {
    shot: Shot;
    lane: number;
    at: number;
    seconds: number;
    n: number;
  } | null,
  /** Which court: the beach net or the pool. */
  prize: "volleyball" as PrizeGame,
};

export const volley = createStore(OFF);

function fly(shot: Shot, now: number, seconds: number, lane: number) {
  const n = (volley.get().flight?.n ?? 0) + 1;
  volley.set({ flight: { shot, lane, at: now, seconds, n } });
}

function feed(now: number, match: Rally) {
  const seconds = ballSeconds(match);
  volley.set({
    phase: "incoming",
    match,
    since: now,
    arrives: now + seconds * 1000,
  });
  // their attack picks a new spot across your court; your set goes up from
  // wherever you dug it
  const lane =
    match.touch === "dig"
      ? Math.random() * 2 - 1
      : (volley.get().flight?.lane ?? 0);
  fly(match.touch === "dig" ? "attack" : "set", now, seconds, lane);
}

export function start(now: number, prize: PrizeGame = volley.get().prize) {
  volley.set({ ...OFF, prize });
  feed(now, NEW_RALLY);
}

export const leave = () => volley.set(OFF);

function hit(now: number, s: Swing) {
  const before = volley.get();
  const { match, outcome } = play(before.match, s);
  const touch = before.match.touch;
  const last = { swing: s, outcome, touch };
  const lane = before.flight?.lane ?? 0;
  if (outcome === "dug") {
    // your setter puts it up for the spike
    volley.set({ last });
    feed(now, match);
  } else if (outcome === "rally") {
    volley.set({ phase: "away", match, since: now, last });
    fly("their-dig", now, AWAY, lane);
  } else {
    volley.set({ phase: "between", match, since: now, last });
    if (outcome === "kill") fly("kill", now, 0.55, lane);
    else fly(touch === "dig" ? "miss" : "net", now, 0.6, lane);
  }
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
