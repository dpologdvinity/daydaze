import type { JSX } from "react";
import { judgesScore, LEAD, type Mark } from "../../../game/gymnastics.ts";
import type { RoutineSession } from "../shared/routineSession.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { floor } from "./session.ts";

const MARK: Record<Mark, string> = {
  stuck: "Stuck it!",
  near: "Close",
  miss: "Missed",
};

/** What a routine's panel says: its name, the call before you start, and
 * its buttons. */
export type RoutineWords = {
  region: string;
  intro: string;
  begin: string;
  leave: string;
};

/** A judged routine: press as each element's ring closes, for the judges. */
export function RoutineCard({
  session,
  words,
}: {
  session: RoutineSession;
  words: RoutineWords;
}): JSX.Element {
  const { store, program, routineTime, start, press, leave } = session;
  const s = store.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "routine");
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label={words.region}>
        <p className="game-call">{words.intro}</p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          {words.begin}
        </button>
      </section>
    );
  const t = routineTime(now);
  const next = program.findIndex(
    (e, i) => s.routine.marks[i] === null && e.at + 0.25 > t,
  );
  const el = next >= 0 ? program[next] : null;
  // the ring closes from 1 to 0 as the cue arrives
  const ring = el ? Math.max(0, Math.min(1, (el.at - t) / LEAD)) : 0;
  const lastIndex = s.routine.marks.reduce((at, m, i) => (m ? i : at), -1);
  const lastMark = lastIndex >= 0 ? s.routine.marks[lastIndex] : null;
  return (
    <section className="game-panel" aria-label={words.region}>
      <p className="game-score" aria-label="Score">
        <span>{judgesScore(s.routine, program).toFixed(3)}</span>
        <span>
          {s.phase === "over"
            ? "Final"
            : `${s.routine.marks.filter(Boolean).length}/${program.length}`}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `The judges: ${judgesScore(s.routine, program).toFixed(3)}`
          : lastMark && lastIndex >= 0
            ? `${program[lastIndex].name}: ${MARK[lastMark]}`
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
        {words.leave}
      </button>
    </section>
  );
}

/** The gym's floor routine. */
export function RoutinePanel(): JSX.Element {
  return (
    <RoutineCard
      session={floor}
      words={{
        region: "Floor routine",
        intro:
          "Eight elements. Press as each ring closes; stick them for the judges.",
        begin: "Start the routine",
        leave: "Step off the floor",
      }}
    />
  );
}
