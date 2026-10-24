// The Gridiron's field-goal panel: five kicks, each aimed against a crosswind
// and struck on a power meter. Rules live in game/fieldGoal.ts and the state in
// ./session.ts; this only reads and presses. Distances are meters, shown in
// yards.

import type { JSX } from "react";
import {
  AIM_LIMIT,
  KICKS,
  made,
  type Result,
} from "../../../game/fieldGoal.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import {
  aimAt,
  current,
  fieldGoals,
  leave,
  powerAt,
  press,
  start,
} from "./session.ts";

const CALL: Record<Result, string> = {
  good: "It's good!",
  "wide-left": "Wide left",
  "wide-right": "Wide right",
  short: "Short",
};
const ACTION: Record<string, string> = {
  aim: "Line it up",
  power: "Kick!",
  flying: "…",
  over: "Kick again",
};

/** Five field goals, each further out with a crosswind: aim into it. */
export function FieldGoalPanel(): JSX.Element {
  const s = fieldGoals.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "aim" || s.phase === "power");
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Field goals">
        <p className="game-call">
          Five field goals, each further out. Mind the wind.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Kick field goals
        </button>
      </section>
    );
  const { distance, wind } = current();
  const last = s.series.results[s.series.results.length - 1];
  return (
    <section className="game-panel" aria-label="Field goals">
      <p className="game-score" aria-label="Kicks">
        {KICKS.map((_, i) => {
          const r = s.series.results[i];
          return (
            <span
              key={i}
              className={r ? `kick-${r === "good" ? "in" : "out"}` : ""}
            >
              {r ? (r === "good" ? "●" : "✕") : "○"}
            </span>
          );
        })}
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `${made(s.series)} of ${KICKS.length} good`
          : s.phase === "flying"
            ? ""
            : `${Math.round(distance * 1.094)} yards, wind ${wind === 0 ? "calm" : `${Math.abs(wind)} ${wind > 0 ? "→" : "←"}`}${last ? ` · ${CALL[last]}` : ""}`}
      </p>
      <label className="game-meter">
        Aim
        <meter
          min={-AIM_LIMIT}
          max={AIM_LIMIT}
          value={s.phase === "aim" ? aimAt(now, s.since) : s.aim}
        />
      </label>
      <label className="game-meter">
        Power
        <meter
          min={0}
          max={1}
          high={0.9}
          optimum={0.75}
          value={s.phase === "power" ? powerAt(now, s.since) : 0}
        />
      </label>
      <button
        type="button"
        className="game-main"
        disabled={s.phase === "flying"}
        onClick={() => press(performance.now())}
      >
        {ACTION[s.phase]}
      </button>
      <button type="button" className="game-leave" onClick={leave}>
        Leave the field
      </button>
    </section>
  );
}
