// The Ice Rink's curling panel: set the aim, then the weight, then sweep while
// the stone slides; six stones an end. State lives in ./curling.ts; this reads
// it and forwards presses.

import type { JSX } from "react";
import { endScore, STONES } from "../../../game/curling.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import {
  aimNow,
  curling,
  leave,
  press,
  start,
  weightNow,
  type Phase,
} from "./curling.ts";

const ACTION: Record<Phase, string> = {
  off: "",
  aim: "Set aim",
  weight: "Throw!",
  sliding: "Sweep!",
  over: "",
};

/** Curling: aim, weight, sweep it home; six stones an end. */
export function CurlingPanel(): JSX.Element {
  const s = curling.use();
  const playing = s.phase !== "off";
  const now = useNow(playing && s.phase !== "over");
  usePressKeys(playing && s.phase !== "over", (t) => press(t), leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Curling">
        <p className="game-call">
          Six stones down the sheet. Set the aim, then the weight; while it
          slides, sweep to carry it further. Closest to the button scores most.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Throw some stones
        </button>
      </section>
    );
  const aim = s.phase === "aim" ? aimNow(now) : s.aim;
  const weight = s.phase === "weight" ? weightNow(now) : s.weight;
  const last = s.end.stones.at(-1);
  return (
    <section className="game-panel" aria-label="Curling">
      <p className="game-score" aria-label="Score">
        <span>{endScore(s.end)} points</span>
        <span>
          Stone{" "}
          {Math.min(s.end.stones.length + (s.phase === "over" ? 0 : 1), STONES)}
          /{STONES}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `End over: ${endScore(s.end)} points`
          : s.phase === "sliding"
            ? "Sweep to carry it further!"
            : last && s.phase === "aim"
              ? last.points
                ? `In the house: ${last.points}!`
                : "Missed the house."
              : s.phase === "aim"
                ? "Stop the arrow where you want it."
                : "Now the weight."}
      </p>
      <label className="game-meter">
        Aim
        <meter min={-1} max={1} value={aim} />
      </label>
      <label className="game-meter">
        Weight
        <meter min={0} max={1} value={weight} />
      </label>
      <div className="game-row">
        {s.phase !== "over" && (
          <button
            type="button"
            className="game-main"
            onClick={() => press(performance.now(), s.phase)}
          >
            {ACTION[s.phase]}
          </button>
        )}
        <button type="button" onClick={leave}>
          {s.phase === "over" ? "Done" : "Stop"}
        </button>
      </div>
    </section>
  );
}
