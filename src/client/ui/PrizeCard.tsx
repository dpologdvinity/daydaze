// The prize card that slides in after a scored game: grade, score, coins paid,
// a personal-best ribbon and any daily challenge bonus. It reads the prizeDesk
// store and dismisses itself after 5 s; a new prize restarts the timer.

import { useEffect } from "react";
import { PRIZE_TABLES } from "../../game/prizes.ts";
import { dismissPrize, prizeDesk } from "./prizeDesk.ts";

const SHOW_MS = 5000;

/** The prize card a finished game slides in: the grade, the score, the coins
 * paid and a personal-best ribbon. */
export function PrizeCard() {
  const { shown, at, challenge } = prizeDesk.use();
  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(dismissPrize, SHOW_MS);
    return () => window.clearTimeout(id);
  }, [shown, at]);
  if (!shown) return null;
  const table = PRIZE_TABLES[shown.game];
  return (
    <aside
      className="prize-card"
      data-grade={shown.grade}
      role="status"
      aria-label="Prize"
    >
      <p className="prize-grade" aria-label={`Grade ${shown.grade}`}>
        {shown.grade}
      </p>
      <div>
        <p className="prize-game">{table.label}</p>
        <p className="prize-score">{table.format(shown.score)}</p>
        <p className="prize-coins">+{shown.coins} coins</p>
        {shown.best && <p className="prize-best">New personal best!</p>}
        {challenge > 0 && (
          <p className="prize-best">Daily challenge done! +{challenge}</p>
        )}
      </div>
      <button type="button" onClick={dismissPrize} aria-label="Close prize">
        ×
      </button>
    </aside>
  );
}
