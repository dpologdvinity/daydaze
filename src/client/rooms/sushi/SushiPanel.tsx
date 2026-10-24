// Sushi Catch's panel: shows the ticket, the plate in reach and the score, and
// grabs on a press. The round's clock is ticked by SushiBelt in the scene, not
// by this panel.

import type { JSX } from "react";
import {
  inReach,
  plateKind,
  PLATES,
  ROUND_SECONDS,
} from "../../../game/sushiCatch.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { leave, press, secondsIn, start, sushi } from "./session.ts";

const label = (id: string) => PLATES.find((p) => p.id === id)?.label ?? id;

/** Sushi Catch: grab the plates your ticket wants as the belt brings them. */
export function SushiPanel(): JSX.Element {
  const s = sushi.use();
  const now = useNow(s.on && !s.over);
  usePressKeys(s.on && !s.over, (t) => press(t), leave);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Sushi Catch">
        <p className="game-call">
          Plates ride the belt past you, faster all the time. Grab the three
          your ticket wants; a wrong plate costs you. One minute.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Catch some sushi
        </button>
      </section>
    );
  const t = secondsIn(now);
  const n = inReach(s.round, t);
  const left = Math.max(0, Math.ceil(ROUND_SECONDS - t));
  return (
    <section className="game-panel" aria-label="Sushi Catch">
      <p className="game-score" aria-label="Score">
        <span>{s.round.score} points</span>
        <span>{s.over ? "Time!" : `${left} s`}</span>
      </p>
      <p aria-label="Ticket">
        Ticket {s.round.ticket + 1}: {s.round.wanted.map(label).join(", ")}
      </p>
      <p className="game-call" role="status">
        {s.over
          ? `Time! ${s.round.score} points, ${s.round.ticket} tickets filled.`
          : s.last
            ? s.last.right
              ? `${s.last.label}: yes!`
              : `${s.last.label}: not on the ticket.`
            : "Grab when a plate you want is in front of you."}
      </p>
      {!s.over && (
        <p aria-label="In front of you">
          In front of you:{" "}
          {n === null ? "nothing yet" : label(plateKind(s.round.seed, n))}
        </p>
      )}
      <div className="game-row">
        {!s.over && (
          <button
            type="button"
            className="game-main"
            onClick={() => press(performance.now())}
          >
            Grab
          </button>
        )}
        <button type="button" onClick={leave}>
          {s.over ? "Done" : "Stop"}
        </button>
      </div>
    </section>
  );
}
