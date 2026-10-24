// The Hot Shots panel at the Dome: a 60-second shootout with aim and power
// meters on one button. State and timing live in ./session.ts; shot spots come
// from src/game/hoops.ts.

import type { JSX } from "react";
import { AIM_LIMIT, spotFor } from "../../../game/hoops.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import {
  aimAt,
  hoops,
  leave,
  powerAt,
  press,
  start,
  timeLeft,
} from "./session.ts";

const ACTION: Record<string, string> = {
  aim: "Aim",
  power: "Shoot!",
  flying: "…",
  over: "Play again",
};

const CALL: Record<string, string> = {
  swish: "Swish!",
  "rim-in": "Off the rim and in!",
  bank: "Banked in!",
  "rim-out": "Rimmed out",
  miss: "Miss",
};

/**
 * Hot Shots: sixty seconds to score from the spots round the hoop. One
 * button: start the aim, lock it, then shoot at the power the meter shows.
 */
export function HoopsPanel(): JSX.Element {
  const s = hoops.use();
  const playing = s.phase !== "off";
  const now = useNow(playing && s.phase !== "over");
  usePressKeys(playing, press, leave);

  if (!playing)
    return (
      <section className="game-panel" aria-label="Hot Shots">
        <p className="game-call">
          Hot Shots: 60 seconds, two points a basket, three from the money spot.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Start the clock
        </button>
      </section>
    );

  const spot = spotFor(s.game);
  const seconds = Math.ceil(timeLeft(now));
  return (
    <section className="game-panel" aria-label="Hot Shots">
      <p className="game-score" aria-label="Score">
        <span>{s.game.points} pts</span>
        <span>
          {s.phase === "over"
            ? "Final"
            : `0:${String(seconds).padStart(2, "0")}`}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `${s.game.made} of ${s.game.shots}: ${s.game.points} points`
          : s.phase === "flying"
            ? ""
            : s.last
              ? CALL[s.last]
              : spot.points === 3
                ? "The money ball: three points"
                : "Two points from here"}
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
          low={0.4}
          high={0.6}
          optimum={0.5}
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
        Leave the court
      </button>
    </section>
  );
}
