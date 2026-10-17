import type { JSX } from "react";
import { BALLS, bucketScore } from "../../../game/golfRange.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { leave, powerAt, press, range, start, strikeAt } from "./session.ts";

const ACTION: Record<string, string> = {
  power: "Backswing",
  strike: "Swing!",
  flying: "…",
  over: "Another bucket",
};

/** A bucket of ten: set the power at the top of the backswing, then strike
 * as the meter crosses the middle; land on the greens to score. */
export function RangePanel(): JSX.Element {
  const s = range.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "power" || s.phase === "strike");
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Driving range">
        <p className="game-call">
          Ten balls. Land them on the greens for points.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Get a bucket
        </button>
      </section>
    );
  const last = s.bucket.shots[s.bucket.shots.length - 1];
  return (
    <section className="game-panel" aria-label="Driving range">
      <p className="game-score" aria-label="Score">
        <span>{bucketScore(s.bucket)} pts</span>
        <span>
          {Math.min(
            s.bucket.shots.length + (s.phase === "over" ? 0 : 1),
            BALLS,
          )}
          /{BALLS}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Bucket done: ${bucketScore(s.bucket)}`
          : s.phase === "flying" || !last
            ? ""
            : `${Math.round(last.rest[1])} m${last.points ? ` · +${last.points}` : ""}`}
      </p>
      <label className="game-meter">
        Power
        <meter
          min={0}
          max={1}
          value={s.phase === "power" ? powerAt(now, s.since) : s.power}
        />
      </label>
      <label className="game-meter">
        Strike
        <meter
          min={-1}
          max={1}
          low={-0.25}
          high={0.25}
          optimum={0}
          value={s.phase === "strike" ? strikeAt(now, s.since) : 0}
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
        Leave the bay
      </button>
    </section>
  );
}
