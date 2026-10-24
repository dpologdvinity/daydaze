// The twin speed slide panel: tuck as each bend comes up to race a rival down.
// Times are in tenths of a second; the race state lives in slideSession.ts and
// this panel only renders it and forwards presses.

import { useEffect, type JSX } from "react";
import { BENDS, finishTenths } from "../../../game/speedSlide.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { leave, press, rivalNow, slide, start, tick } from "./slideSession.ts";

const CALL = {
  perfect: "Perfect tuck!",
  good: "Good tuck",
  early: "Too early",
  late: "Too late",
} as const;

const secs = (tenths: number) => `${(tenths / 10).toFixed(1)} s`;

/** The twin speed slides: tuck at each bend to beat the rival down. */
export function SlidePanel(): JSX.Element {
  const s = slide.use();
  const now = useNow(s.phase === "sliding");
  useEffect(() => tick(now), [now]);
  usePressKeys(s.phase === "sliding", (t) => press(t), leave);
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Speed slide">
        <p className="game-call">
          Race the twin speed slides. Tuck as you hit each of the {BENDS} bends
          to cut the corner.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Race the slide
        </button>
      </section>
    );
  const mine = finishTenths(s.run);
  const rival = rivalNow();
  return (
    <section className="game-panel" aria-label="Speed slide">
      <p className="game-score" aria-label="Score">
        <span>
          Bend {Math.min(s.run.length + (s.phase === "over" ? 0 : 1), BENDS)}/
          {BENDS}
        </span>
        <span>Rival {secs(rival)}</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? mine < rival
            ? `You win in ${secs(mine)}!`
            : mine > rival
              ? `The rival takes it: you ${secs(mine)}.`
              : `A dead heat at ${secs(mine)}.`
          : s.last
            ? CALL[s.last]
            : "Push off!"}
      </p>
      {s.phase === "sliding" ? (
        <>
          <button
            type="button"
            className="game-main"
            onClick={() => press(performance.now())}
          >
            Tuck!
          </button>
        </>
      ) : (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Race again
        </button>
      )}
      <button type="button" onClick={leave}>
        Climb out
      </button>
    </section>
  );
}
