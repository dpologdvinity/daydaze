import { useState, type JSX } from "react";
import {
  deal,
  drawCard,
  label,
  playable,
  playCard,
  SUITS,
  topCard,
  type Table,
} from "../../game/cards/crazyEights.ts";

/** Crazy Eights against an NPC (the jail guard by default). `onWin` runs
 * once when you empty your hand first. */
export function CardTable({
  onWin,
  onClose,
  rival = "The guard",
  winLine = "You win! A minute off your sentence.",
}: {
  onWin?: () => void;
  onClose: () => void;
  rival?: string;
  winLine?: string;
}): JSX.Element {
  const shuffle = () => deal(Math.floor(Math.random() * 1e9), rival);
  const [table, setTable] = useState<Table>(shuffle);
  // an eight waiting for you to name its suit
  const [eight, setEight] = useState<number | null>(null);
  const move = (next: Table) => {
    setTable(next);
    if (next.winner === "you" && table.winner === null) onWin?.();
  };
  const top = topCard(table);
  return (
    <section className="game-panel card-table" aria-label="Crazy Eights">
      <p className="game-score">
        <span>
          Top: {label(top)}
          {table.suit !== top.suit ? ` (${SUITS[table.suit]} called)` : ""}
        </span>
        <span>
          {rival} holds {table.guard.length}
        </span>
      </p>
      <p className="game-call" role="status">
        {table.winner === "you"
          ? winLine
          : table.winner === "guard"
            ? `${rival} wins this one.`
            : table.guardDid || "Match the suit or the rank. Eights are wild."}
      </p>
      {eight !== null ? (
        <div className="game-row" role="group" aria-label="Call a suit">
          {SUITS.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={`Call ${["spades", "hearts", "diamonds", "clubs"][i]}`}
              onClick={() => {
                move(playCard(table, eight, i));
                setEight(null);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="game-row card-hand" role="group" aria-label="Your hand">
          {table.you.map((c, i) => (
            <button
              key={`${c.rank}-${c.suit}`}
              type="button"
              disabled={!!table.winner || !playable(table, c)}
              className={c.suit === 1 || c.suit === 2 ? "card red" : "card"}
              onClick={() =>
                c.rank === 8 ? setEight(i) : move(playCard(table, i))
              }
            >
              {label(c)}
            </button>
          ))}
        </div>
      )}
      <div className="game-row">
        {table.winner ? (
          <button
            type="button"
            className="game-main"
            onClick={() => setTable(shuffle())}
          >
            Deal again
          </button>
        ) : (
          <button type="button" onClick={() => move(drawCard(table))}>
            Draw
          </button>
        )}
        <button type="button" onClick={onClose}>
          Fold
        </button>
      </div>
    </section>
  );
}
