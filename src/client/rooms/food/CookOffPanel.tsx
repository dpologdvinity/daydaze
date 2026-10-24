// Kamayan Hall's cook-off panel: eight Filipino tickets on the shared order
// panel, against Tita Baby's ghost score or another player's score over the net
// (src/client/net/cookOff.ts). A match only counts when its seed matches the
// running shift's seed.

import { useEffect, useRef, type JSX } from "react";
import { ghostScore, outcome } from "../../../game/cookOff.ts";
import { score, shiftOver } from "../../../game/orders.ts";
import { cookOff, endCookOff, sendScore } from "../../net/cookOff.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";
import { cookOffSession as session } from "./cookOffSession.ts";

const VERDICT = {
  win: "You win the cook-off!",
  lose: "They take it this time.",
  tie: "Dead even. Rematch?",
} as const;

/** Kamayan Hall's kitchen: eight Filipino tickets against Tita Baby's ghost
 * score, or the same eight against another player. */
export function CookOffPanel(): JSX.Element {
  const s = session.store.use();
  const c = cookOff.use();
  const vs = c.match && s.on && c.match.seed === s.shift.seed ? c.match : null;
  const over = s.on && shiftOver(s.shift);
  const mine = score(s.shift);
  // your final score goes to your rival once per match
  const sentFor = useRef<number | null>(null);
  useEffect(() => {
    if (!over || !vs || sentFor.current === vs.seed) return;
    sentFor.current = vs.seed;
    sendScore(mine);
  }, [over, vs, mine]);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Cook-off">
        <p className="game-call">
          {c.match
            ? `Cook-off with ${c.match.name}: the same eight tickets, highest score wins.`
            : "Cook-off: eight tickets of adobo, sinigang, pancit and more. Beat Tita Baby's score."}
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => session.start(performance.now(), c.match?.seed)}
        >
          {c.match ? "Start the cook-off" : "Cook against Tita Baby"}
        </button>
      </section>
    );
  const rival = vs ? vs.name : "Tita Baby";
  const theirs = vs ? vs.theirs : ghostScore(s.shift.seed);
  return (
    <>
      <OrderPanel
        session={session}
        title="Cook-off"
        intro=""
        startLabel=""
        vessel="plate"
        serveLabel="Plate it"
        tipWord="speed bonus"
        tipsWord="speed bonus"
      />
      <section className="game-panel" aria-label="Rival">
        <p className="game-call" role="status">
          {theirs === null
            ? `${rival} is still cooking…`
            : over
              ? `${rival}: ${theirs}. ${VERDICT[outcome(mine, theirs)]}`
              : `${rival} scored ${theirs}.`}
        </p>
        {over && vs && (
          <button type="button" onClick={endCookOff}>
            Done
          </button>
        )}
      </section>
    </>
  );
}
