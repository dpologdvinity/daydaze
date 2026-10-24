// Lagoon Links' controls and score card: turn the aim, start the power
// swinging, strike. Keys: arrows turn, Space or Enter press, Escape leaves.
// Keeps its own copies of `typing` and `useNow` rather than the ones in
// shared/useNow.ts.

import { useEffect, useState, type JSX } from "react";
import { HOLES, holeIndex, totals } from "../../../game/minigolf.ts";
import {
  leaveCourse,
  powerAt,
  press,
  startRound,
  turn,
  useCourse,
} from "./session.ts";

const ACTION: Record<string, string> = {
  aim: "Putt",
  power: "Hit!",
  rolling: "Rolling…",
  holed: "Next hole",
  over: "Play again",
};

const sameSpot = (a: readonly number[], b: readonly number[]) =>
  a[0] === b[0] && a[1] === b[1];

/** What the starter would call out when a hole is finished. */
function holedCall(strokes: number, par: number, holed: boolean): string {
  if (!holed) return `Picked up after ${strokes}`;
  if (strokes === 1) return "Hole in one!";
  const NAMES: Record<number, string> = {
    [-2]: "Eagle!",
    [-1]: "Birdie!",
    0: "Par",
    1: "Bogey",
  };
  return NAMES[strokes - par] ?? `In for ${strokes}`;
}

/** One press of an aim button or arrow key: two degrees. */
const STEP = (2 * Math.PI) / 180;

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

function useNow(running: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    let id = requestAnimationFrame(function tick(t) {
      setNow(t);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
  return now;
}

function Card(): JSX.Element {
  const { round } = useCourse();
  const at = holeIndex(round);
  return (
    <table className="game-card" aria-label="Score card">
      <thead>
        <tr>
          <th scope="col">Hole</th>
          {HOLES.map((h, i) => (
            <th
              key={h.name}
              scope="col"
              aria-current={at === i && !round.done ? "step" : undefined}
            >
              {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Par</th>
          {HOLES.map((h) => (
            <td key={h.name}>{h.par}</td>
          ))}
        </tr>
        <tr>
          <th scope="row">You</th>
          {HOLES.map((h, i) => (
            <td key={h.name}>{i <= at ? round.strokes[i] || "" : ""}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Lagoon Links' controls: turn the aim, then one button to start the power
 * swinging and strike at what it shows. The arrows turn, Space or Enter
 * press, Escape leaves.
 */
export function GolfPanel(): JSX.Element {
  const course = useCourse();
  const now = useNow(course.phase === "power");

  useEffect(() => {
    if (course.phase === "off") return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === "Space" || e.code === "Enter") {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        press(performance.now());
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        turn(-STEP);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        turn(STEP);
      } else if (e.code === "Escape") leaveCourse();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [course.phase]);

  if (course.phase === "off")
    return (
      <section className="game-panel" aria-label="Mini golf">
        <button type="button" className="game-main" onClick={startRound}>
          Play a round
        </button>
      </section>
    );

  const i = holeIndex(course.round);
  const hole = HOLES[i];
  const strokes = course.round.strokes[i];
  const { toPar } = totals(course.round);
  const call =
    course.phase === "over"
      ? `Round over: ${toPar === 0 ? "level par" : toPar > 0 ? `${toPar} over` : `${-toPar} under`}`
      : course.phase === "holed"
        ? holedCall(strokes, hole.par, sameSpot(course.round.ball, hole.cup))
        : `Hole ${i + 1}: ${hole.name}, par ${hole.par}`;
  return (
    <>
      <Card />
      <section className="game-panel" aria-label="Mini golf">
        <p className="game-call" role="status">
          {course.phase === "rolling" ? "" : call}
        </p>
        <div className="game-row" role="group" aria-label="Aim">
          <button
            type="button"
            aria-label="Aim left"
            disabled={course.phase !== "aim"}
            onClick={() => turn(-STEP)}
          >
            ◀
          </button>
          <span className="game-label">Aim</span>
          <button
            type="button"
            aria-label="Aim right"
            disabled={course.phase !== "aim"}
            onClick={() => turn(STEP)}
          >
            ▶
          </button>
        </div>
        <label className="game-meter">
          Power
          <meter
            min={0}
            max={1}
            low={0.3}
            high={0.8}
            optimum={0.5}
            value={course.phase === "power" ? powerAt(now, course.since) : 0}
          />
        </label>
        <button
          type="button"
          className="game-main"
          disabled={course.phase === "rolling"}
          onClick={() => press(performance.now())}
        >
          {ACTION[course.phase]}
        </button>
        <button type="button" className="game-leave" onClick={leaveCourse}>
          Leave the course
        </button>
      </section>
    </>
  );
}
