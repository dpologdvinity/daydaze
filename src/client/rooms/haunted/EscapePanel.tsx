// The haunted escape's panel: the room count, your nerve, the line for
// what just happened and the three doors. The rooms, the walk to a door and
// the scares play in the house itself (EscapeSet.tsx).

import { useEffect, type JSX } from "react";
import { DEPTH, NERVE, runScore } from "../../../game/hauntedRun.ts";
import { useNow } from "../shared/useNow.ts";
import { escape, leave, pick, start, tick } from "./escapeSession.ts";

const DOORS = ["Left door", "Door ahead", "Right door"] as const;

/** Find the way out of the haunted house: three doors a room, one goes on. */
export function EscapePanel(): JSX.Element {
  const s = escape.use();
  const live = s.phase !== "off" && s.phase !== "over";
  const now = useNow(live);
  useEffect(() => {
    if (live) tick(now);
  }, [now, live]);
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Find the way out">
        <p className="game-call">
          Find the way out: eight rooms, three doors each. One door goes on; the
          others hold a scare and cost you nerve.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Step inside
        </button>
      </section>
    );
  const { run } = s;
  return (
    <section
      className="game-panel"
      aria-label="Find the way out"
      data-scared={s.phase === "scare"}
    >
      <p className="game-score" aria-label="Progress">
        <span>
          Room {Math.min(run.depth + 1, DEPTH)}/{DEPTH}
        </span>
        <span aria-label={`Nerve ${run.nerve} of ${NERVE}`}>
          {"♥".repeat(run.nerve)}
          {"♡".repeat(NERVE - run.nerve)}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? run.escaped
            ? `You're out! ${runScore(run)} points.`
            : "Your nerve gives out. You run for the front door."
          : s.phase === "walk"
            ? "You reach for the handle…"
            : s.phase === "through"
              ? "Deeper in."
              : s.scare
                ? s.scare.line
                : run.depth === 0
                  ? "The front door creaks shut."
                  : "Deeper in."}
      </p>
      {s.phase !== "over" && (
        <div className="game-row" role="group" aria-label="Doors">
          {DOORS.map((label, door) => (
            <button
              key={door}
              type="button"
              disabled={s.phase !== "choose"}
              onClick={() => pick(door, performance.now())}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={leave}>
        {s.phase === "over" ? "Back to the hall" : "Run for it"}
      </button>
    </section>
  );
}
