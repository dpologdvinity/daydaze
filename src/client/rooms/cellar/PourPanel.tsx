import { useEffect, type JSX } from "react";
import {
  flightOver,
  flightScore,
  GLASSES,
  LINE,
  WINES,
} from "../../../game/winePour.ts";
import { typing, useNow } from "../shared/useNow.ts";
import { cellar, hold, leave, levelNow, release, start } from "./session.ts";

/** Pour a flight: hold to pour, let go on the line. */
export function PourPanel(): JSX.Element {
  const s = cellar.use();
  const pouring = s.pouring !== null;
  const now = useNow(pouring);
  const over = flightOver(s.flight);
  useEffect(() => {
    if (!s.on || over) return;
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.code !== "Space" || e.repeat) return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      hold(performance.now());
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") release(performance.now());
      else if (e.code === "Escape") leave();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [s.on, over]);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Wine flight">
        <p className="game-call">
          Pour a flight of five: hold to pour, let go on the line. Each wine
          runs at its own speed.
        </p>
        <button type="button" className="game-main" onClick={start}>
          Pour a flight
        </button>
      </section>
    );
  const glass = s.flight.pours.length;
  const wine = WINES[glass % WINES.length];
  const last = s.flight.pours[glass - 1];
  return (
    <section className="game-panel" aria-label="Wine flight">
      <p className="game-score" aria-label="Flight">
        <span>{flightScore(s.flight)} points</span>
        <span>
          Glass {Math.min(glass + (over ? 0 : 1), GLASSES)}/{GLASSES}
        </span>
      </p>
      <p className="game-call" role="status">
        {over
          ? `Flight poured: ${flightScore(s.flight)} points`
          : pouring
            ? `Pouring the ${wine?.name}…`
            : last
              ? last.points === 0 && last.level > 1
                ? "Over the rim!"
                : `${last.points} points. Next: ${wine?.name}`
              : `First: ${wine?.name}`}
      </p>
      {!over && (
        <label className="game-meter">
          Glass (the line is at {Math.round(LINE * 100)}%)
          <meter
            min={0}
            max={1}
            low={LINE - 0.06}
            high={LINE + 0.06}
            optimum={LINE}
            value={Math.min(1, levelNow(now))}
          />
        </label>
      )}
      {over ? (
        <button type="button" className="game-main" onClick={start}>
          Pour another
        </button>
      ) : (
        <button
          type="button"
          className="game-main"
          onPointerDown={() => hold(performance.now())}
          onPointerUp={() => release(performance.now())}
          onPointerLeave={() => release(performance.now())}
        >
          Hold to pour
        </button>
      )}
      <button type="button" onClick={leave}>
        Set the bottle down
      </button>
    </section>
  );
}
