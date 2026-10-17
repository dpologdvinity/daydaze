import {
  ballSeconds,
  gradeSwing,
  matchOver,
  NEW_MATCH,
  play,
  pointsWon,
  type Match,
  type Outcome,
  type Swing,
} from "../../../game/tennis.ts";
import { award } from "../../ui/prizeDesk.ts";
import { crowd } from "../shared/Stands.tsx";
import { createStore } from "../shared/store.ts";

/**
 * Seven points against the club pro. She feeds each point; the ball comes
 * over the net to you and you swing as it arrives. A swing that's on time
 * sends it back and she returns it, quicker; a perfect one deep in a rally
 * is a winner. Miss and the point is hers.
 */
export type Phase = "off" | "incoming" | "outgoing" | "between" | "over";

/** Seconds your return takes to reach her, and the pause between points. */
export const OUTGOING = 0.9;
const BETWEEN = 1.6;

const OFF = {
  phase: "off" as Phase,
  match: NEW_MATCH as Match,
  /** performance.now() the phase started. */
  since: 0,
  /** performance.now() the incoming ball reaches you. */
  arrives: 0,
  last: null as { swing: Swing; outcome: Outcome } | null,
};

export const tennis = createStore(OFF);

function feed(now: number, match: Match) {
  tennis.set({
    phase: "incoming",
    match,
    since: now,
    arrives: now + ballSeconds(match.rally) * 1000,
  });
}

export function start(now: number) {
  tennis.set(OFF);
  feed(now, NEW_MATCH);
}

export function leave() {
  tennis.set(OFF);
}

function swing(now: number, s: Swing) {
  const { match, outcome } = play(tennis.get().match, s);
  const last = { swing: s, outcome };
  if (outcome === "rally")
    tennis.set({ phase: "outgoing", match, since: now, last });
  else {
    if (outcome === "winner") crowd.cheer = 1;
    tennis.set({ phase: "between", match, since: now, last });
  }
}

/** `seen` is the phase the button showed: a press on a label the screen
 * hadn't caught up from yet is dropped. */
export function press(now: number, seen?: Phase) {
  const s = tennis.get();
  if (seen !== undefined && seen !== s.phase) return;
  if (s.phase === "incoming") swing(now, gradeSwing((now - s.arrives) / 1000));
  else if (s.phase === "over") start(now);
}

/** The scene calls this each frame: a ball you didn't swing at goes past,
 * your return comes back, and the next point is fed. */
export function tick(now: number) {
  const s = tennis.get();
  if (s.phase === "incoming" && now - s.arrives > 400) swing(now, "late");
  else if (s.phase === "outgoing" && now - s.since >= OUTGOING * 1000)
    feed(now, s.match);
  else if (s.phase === "between" && now - s.since >= BETWEEN * 1000) {
    if (matchOver(s.match)) {
      award("tennis", pointsWon(s.match));
      tennis.set({ phase: "over", since: now });
    } else feed(now, s.match);
  }
}
