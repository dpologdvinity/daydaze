import { useSyncExternalStore } from "react";
import {
  HOLES,
  holeIndex,
  NEW_ROUND,
  nextHole,
  putt,
  roundOver,
  scorePutt,
  totals,
  type PuttResult,
  type Round,
} from "../../../game/minigolf.ts";
import { award } from "../../ui/prizeDesk.ts";

/**
 * A round on the course, shared by the scene (which draws the ball and
 * plays each putt back) and the overlay's panel (which takes the aim and
 * power and shows the card).
 *
 * A stroke: turn the aim, press Putt to start the power swinging, press
 * again to hit at the power shown.
 */
export type Phase = "off" | "aim" | "power" | "rolling" | "holed" | "over";

export type Course = {
  phase: Phase;
  round: Round;
  aim: number;
  /** When the power swing started, or the putt was struck: performance.now(). */
  since: number;
  putt: PuttResult | null;
};

const OFF: Course = {
  phase: "off",
  round: NEW_ROUND,
  aim: 0,
  since: 0,
  putt: null,
};

let course: Course = OFF;
const listeners = new Set<() => void>();

function set(next: Partial<Course>) {
  course = { ...course, ...next };
  for (const l of listeners) l();
}

export function getCourse(): Course {
  return course;
}

export function useCourse(): Course {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getCourse,
    getCourse,
  );
}

/** The power swing, 0..1, at `now`. */
export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.1) * 0.5;
}

/** Aim straight at the cup from where the ball lies: a fair first guess. */
function aimAtCup(round: Round): number {
  const hole = HOLES[holeIndex(round)];
  const [bx, bz] = round.ball;
  return Math.atan2(hole.cup[0] - bx, -(hole.cup[1] - bz));
}

export function startRound() {
  set({ ...OFF, phase: "aim", aim: aimAtCup(NEW_ROUND) });
}

export function leaveCourse() {
  set(OFF);
}

/** Turns the aim by `radians`. */
export function turn(radians: number) {
  if (course.phase === "aim") set({ aim: course.aim + radians });
}

/** The one button: start the power swing, then strike; between holes, go
 * on to the next; after the last, play again. */
export function press(now: number) {
  if (course.phase === "aim") set({ phase: "power", since: now });
  else if (course.phase === "power") {
    const hole = HOLES[holeIndex(course.round)];
    const result = putt(hole, course.round.ball, {
      aim: course.aim,
      power: powerAt(now, course.since),
    });
    set({ phase: "rolling", putt: result, since: now });
  } else if (course.phase === "holed") {
    const round = nextHole(course.round);
    set({ phase: "aim", round, aim: aimAtCup(round), putt: null });
  } else if (course.phase === "over") startRound();
}

/** The scene calls this when a putt has played out. */
export function settle() {
  if (course.phase !== "rolling" || !course.putt) return;
  const round = scorePutt(course.round, course.putt);
  if (roundOver(round)) award("mini-golf", totals(round).toPar);
  set({
    round,
    putt: null,
    phase: roundOver(round) ? "over" : round.done ? "holed" : "aim",
    aim: round.done ? course.aim : aimAtCup(round),
  });
}
