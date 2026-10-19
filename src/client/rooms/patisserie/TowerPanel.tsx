import type { JSX } from "react";
import { height, towerScore } from "../../../game/macaronTower.ts";
import { usePressKeys } from "../shared/useNow.ts";
import { leave, press, start, tower } from "./session.ts";

/** Sucre's stand: drop each macaron as it slides over the tower. */
export function TowerPanel(): JSX.Element {
  const s = tower.use();
  usePressKeys(s.on && !s.tower.over, press, leave);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Macaron tower">
        <p className="game-call">
          Stack macarons on the stand: drop each one dead over the last, or the
          overhang falls away.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Build a tower
        </button>
      </section>
    );
  const over = s.tower.over;
  return (
    <section className="game-panel" aria-label="Macaron tower">
      <p className="game-score" aria-label="Tower">
        <span>{height(s.tower)} high</span>
        <span>{towerScore(s.tower)} points</span>
      </p>
      <p className="game-call" role="status">
        {over
          ? `It toppled at ${height(s.tower)}: ${s.tower.perfects} perfect`
          : s.perfect
            ? "Perfect!"
            : height(s.tower) === 0
              ? "Drop it when it's over the stand."
              : "Next one…"}
      </p>
      {over ? (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Build again
        </button>
      ) : (
        <button
          type="button"
          className="game-main"
          onClick={() => press(performance.now())}
        >
          Drop
        </button>
      )}
      <button type="button" onClick={leave}>
        Step away
      </button>
    </section>
  );
}
