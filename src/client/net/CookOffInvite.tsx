import { useEffect, type JSX } from "react";
import {
  answerCook,
  cookOff,
  endCookOff,
  listenForCookOffs,
} from "./cookOff.ts";

/** A cook-off invite, wherever you are; the match itself is cooked at
 * Kamayan Hall (rooms/food/CookOffPanel.tsx). */
export function CookOffInvite(): JSX.Element | null {
  const s = cookOff.use();
  useEffect(() => listenForCookOffs(), []);
  if (s.invite)
    return (
      <section className="game-panel" aria-label="Cook-off invite">
        <p className="game-call">
          {s.invite.name} challenges you to a cook-off at Kamayan Hall.
        </p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answerCook(true)}
          >
            Cook
          </button>
          <button type="button" onClick={() => answerCook(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.asked)
    return (
      <section className="game-panel" aria-label="Cook-off invite">
        <p className="game-call" role="status">
          Waiting for {s.asked.name} to answer…
        </p>
        <button type="button" onClick={endCookOff}>
          Never mind
        </button>
      </section>
    );
  return s.note ? (
    <p className="notice" role="status">
      {s.note}
    </p>
  ) : null;
}
