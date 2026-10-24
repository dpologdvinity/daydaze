// Seaside Stadium's penalty shootout panel: five kicks, each a sweeping
// direction locked by a press, then a power meter where too hard goes over the
// bar. Rules live in game/penalty.ts and the state in ./session.ts.

import type { JSX } from "react";
import { goals, KICKS, type Outcome } from "../../../game/penalty.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import {
  directionAt,
  leave,
  penalties,
  powerAt,
  press,
  start,
} from "./session.ts";

const ACTION: Record<string, string> = {
  aim: "Pick your spot",
  power: "Strike!",
  flying: "…",
  over: "Go again",
};

const CALL: Record<Outcome, string> = {
  goal: "GOAL!",
  saved: "Saved!",
  wide: "Wide",
  over: "Over the bar",
  post: "Off the woodwork",
};

const MARK: Record<Outcome, string> = {
  goal: "●",
  saved: "✕",
  wide: "✕",
  over: "✕",
  post: "✕",
};

/**
 * The penalty shootout: five kicks. One button: start the direction
 * sweeping across the goal, lock it, then strike at the power shown; hit it
 * too hard and it rises over the bar.
 */
export function PenaltyPanel(): JSX.Element {
  const s = penalties.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "aim" || s.phase === "power");
  usePressKeys(playing, press, leave);

  if (!playing)
    return (
      <section className="game-panel" aria-label="Penalties">
        <p className="game-call">Five penalties against the keeper.</p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Take penalties
        </button>
      </section>
    );

  const last = s.game.results[s.game.results.length - 1];
  const scored = goals(s.game);
  return (
    <section className="game-panel" aria-label="Penalties">
      <p className="game-score" aria-label="Kicks">
        {Array.from({ length: KICKS }, (_, i) => {
          const r = s.game.results[i];
          return (
            <span
              key={i}
              className={r ? `kick-${r === "goal" ? "in" : "out"}` : ""}
            >
              {r ? MARK[r] : "○"}
            </span>
          );
        })}
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `${scored} of ${KICKS}${scored === KICKS ? ": perfect!" : scored >= 4 ? ": ice cold" : ""}`
          : s.phase === "flying" || !last
            ? ""
            : CALL[last]}
      </p>
      <label className="game-meter">
        Direction
        <meter
          min={-1.2}
          max={1.2}
          value={s.phase === "aim" ? directionAt(now, s.since) : s.direction}
        />
      </label>
      <label className="game-meter">
        Power
        <meter
          min={0}
          max={1}
          high={0.85}
          optimum={0.55}
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
        Leave the pitch
      </button>
    </section>
  );
}
