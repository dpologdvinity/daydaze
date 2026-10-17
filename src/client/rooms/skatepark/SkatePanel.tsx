import type { JSX } from "react";
import { RUN_SECONDS } from "../../../game/skate.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { bail, dropIn, runTime, skate, trick } from "./session.ts";

const GRADE: Record<string, string> = {
  perfect: "Perfect",
  good: "Clean",
  bail: "Bail!",
};

/**
 * The half-pipe run: forty-five seconds; press Trick as you come up each
 * wall, timed to the lip. Clean tricks in a row build a combo; a bail
 * drops it.
 */
export function SkatePanel(): JSX.Element {
  const s = skate.use();
  const riding = s.phase === "riding";
  const now = useNow(riding);
  usePressKeys(s.phase !== "off", trick, bail);

  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Half-pipe">
        <p className="game-call">
          Drop in: press Trick as you come up each wall, right at the lip.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => dropIn(performance.now())}
        >
          Drop in
        </button>
      </section>
    );

  const left = Math.max(0, Math.ceil(RUN_SECONDS - runTime(now)));
  const last = s.run.last;
  return (
    <section className="game-panel" aria-label="Half-pipe">
      <p className="game-score" aria-label="Score">
        <span>{s.run.score}</span>
        <span>{riding ? `0:${String(left).padStart(2, "0")}` : "Final"}</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Run over: ${s.run.score}`
          : last
            ? last.grade === "bail"
              ? "Bail!"
              : `${GRADE[last.grade]} ${last.trick}${s.run.combo > 1 ? ` ×${s.run.combo}` : ""}`
            : "Wait for the wall…"}
      </p>
      <button
        type="button"
        className="game-main"
        onClick={() => trick(performance.now())}
      >
        {s.phase === "over" ? "Drop in again" : "Trick!"}
      </button>
      <button type="button" className="game-leave" onClick={bail}>
        Step off
      </button>
    </section>
  );
}
