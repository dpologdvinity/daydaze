// The Skee-Ball panel at the Boardwalk Arcade: aim and power meters and the
// press button, driven by the session in ./session.ts. Scoring comes from
// src/game/skeeBall.ts.

import type { JSX } from "react";
import { BALLS, total } from "../../../game/skeeBall.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { aimNow, leave, powerNow, press, skee, start } from "./session.ts";

const ACTION: Record<string, string> = {
  aim: "Set aim",
  power: "Roll!",
  rolling: "…",
};

/** The middle lane: stop the aim, stop the power, nine balls a game. */
export function SkeePanel(): JSX.Element {
  const s = skee.use();
  const playing = s.phase !== "off";
  const now = useNow(playing && s.phase !== "over");
  usePressKeys(playing && s.phase !== "over", (t) => press(t), leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Skee-Ball">
        <p className="game-call">
          Nine balls up the middle lane. Firm and straight for the 50; hard into
          a top corner for a 100.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Play Skee-Ball
        </button>
      </section>
    );
  const aim = s.phase === "aim" ? aimNow(now) : s.aim;
  const power = s.phase === "power" ? powerNow(now) : s.power;
  return (
    <section className="game-panel" aria-label="Skee-Ball">
      <p className="game-score" aria-label="Score">
        <span>{total(s.game)} points</span>
        <span>
          Ball{" "}
          {Math.min(s.game.rolls.length + (s.phase === "over" ? 0 : 1), BALLS)}/
          {BALLS}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Game over: ${total(s.game)} points`
          : s.phase === "rolling" && s.last !== null
            ? s.last === 0
              ? "Gutter!"
              : `${s.last}!`
            : s.phase === "aim"
              ? "Stop the arrow where you want it."
              : "Now the power."}
      </p>
      <label className="game-meter">
        Aim
        <meter
          min={-1}
          max={1}
          low={-0.75}
          high={0.75}
          optimum={0}
          value={aim}
        />
      </label>
      <label className="game-meter">
        Power
        <meter min={0} max={1} value={power} />
      </label>
      {s.phase === "over" ? (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Play again
        </button>
      ) : (
        <button
          type="button"
          className="game-main"
          disabled={s.phase === "rolling"}
          onClick={() => press(performance.now(), s.phase)}
        >
          {ACTION[s.phase]}
        </button>
      )}
      <button type="button" onClick={leave}>
        Walk away
      </button>
    </section>
  );
}
