import type { JSX } from "react";
import {
  judgesScore,
  LEAD,
  ROUTINE,
  type Mark,
} from "../../../game/gymnastics.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { gym, leave, press, routineTime, start } from "./session.ts";

const MARK: Record<Mark, string> = {
  stuck: "Stuck it!",
  near: "Close",
  miss: "Missed",
};

/** The floor routine: press as each element's ring closes, for the judges. */
export function RoutinePanel(): JSX.Element {
  const s = gym.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "routine");
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Floor routine">
        <p className="game-call">
          Eight elements. Press as each ring closes; stick them for the judges.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Start the routine
        </button>
      </section>
    );
  const t = routineTime(now);
  const next = ROUTINE.findIndex(
    (e, i) => s.routine.marks[i] === null && e.at + 0.25 > t,
  );
  const el = next >= 0 ? ROUTINE[next] : null;
  // the ring closes from 1 to 0 as the cue arrives
  const ring = el ? Math.max(0, Math.min(1, (el.at - t) / LEAD)) : 0;
  const lastIndex = s.routine.marks.reduce((at, m, i) => (m ? i : at), -1);
  const lastMark = lastIndex >= 0 ? s.routine.marks[lastIndex] : null;
  return (
    <section className="game-panel" aria-label="Floor routine">
      <p className="game-score" aria-label="Score">
        <span>{judgesScore(s.routine).toFixed(3)}</span>
        <span>
          {s.phase === "over"
            ? "Final"
            : `${s.routine.marks.filter(Boolean).length}/${ROUTINE.length}`}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `The judges: ${judgesScore(s.routine).toFixed(3)}${judgesScore(s.routine) >= s.best ? ", your best!" : ""}`
          : lastMark && lastIndex >= 0
            ? `${ROUTINE[lastIndex].name}: ${MARK[lastMark]}`
            : "Here we go…"}
      </p>
      <div className="routine-cue" aria-hidden="true">
        <span className="routine-name">{el ? el.name : ""}</span>
        <span
          className="routine-ring"
          style={{
            transform: `scale(${0.35 + ring * 1.4})`,
            opacity: el ? 1 : 0,
          }}
        />
        <span className="routine-target" />
      </div>
      <button
        type="button"
        className="game-main"
        onClick={() => press(performance.now())}
      >
        {s.phase === "over" ? "Go again" : "Now!"}
      </button>
      <button type="button" className="game-leave" onClick={leave}>
        Step off the floor
      </button>
    </section>
  );
}
