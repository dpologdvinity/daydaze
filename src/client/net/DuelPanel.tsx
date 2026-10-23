import { useEffect, useState, type JSX } from "react";
import {
  label,
  playable,
  SUITS,
  topCard,
} from "../../game/cards/crazyEights.ts";
import { otherSeat } from "../../game/cards/duel.ts";
import { answer, duel, leaveTable, listenForDuels, move } from "./duel.ts";

const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"] as const;

/** Crazy Eights with another player: their invite, your waiting, and the
 * table itself, your hand from your side. */
export function DuelPanel(): JSX.Element | null {
  const s = duel.use();
  const [eight, setEight] = useState<number | null>(null);
  useEffect(() => listenForDuels(), []);
  if (s.invite)
    return (
      <section className="game-panel" aria-label="Card game invite">
        <p className="game-call">{s.invite.name} wants to play Crazy Eights.</p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answer(true)}
          >
            Play
          </button>
          <button type="button" onClick={() => answer(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.asked)
    return (
      <section className="game-panel" aria-label="Card game invite">
        <p className="game-call" role="status">
          Waiting for {s.asked.name} to answer…
        </p>
        <button type="button" onClick={leaveTable}>
          Never mind
        </button>
      </section>
    );
  if (!s.game)
    return s.note ? (
      <p className="notice" role="status">
        {s.note}
      </p>
    ) : null;
  const { table, seat, name } = s.game;
  const hand = seat === "you" ? table.you : table.guard;
  const theirs = (seat === "you" ? table.guard : table.you).length;
  const mine = table.turn === seat;
  const top = topCard(table);
  return (
    <section className="game-panel card-table" aria-label="Crazy Eights">
      <p className="game-score">
        <span>
          Top: {label(top)}
          {table.suit !== top.suit ? ` (${SUITS[table.suit]} called)` : ""}
        </span>
        <span>
          {name} holds {theirs}
        </span>
      </p>
      <p className="game-call" role="status">
        {table.winner === seat
          ? `You win against ${name}!`
          : table.winner === otherSeat(seat)
            ? `${name} wins this one.`
            : mine
              ? "Your turn: match the suit or the rank. Eights are wild."
              : `${name}'s turn…`}
      </p>
      {eight !== null ? (
        <div className="game-row" role="group" aria-label="Call a suit">
          {SUITS.map((suit, i) => (
            <button
              key={suit}
              type="button"
              aria-label={`Call ${SUIT_NAMES[i]}`}
              onClick={() => {
                move({ k: "play", i: eight, s: i });
                setEight(null);
              }}
            >
              {suit}
            </button>
          ))}
        </div>
      ) : (
        <div className="game-row card-hand" role="group" aria-label="Your hand">
          {hand.map((c, i) => (
            <button
              key={`${c.rank}-${c.suit}`}
              type="button"
              disabled={!mine || !!table.winner || !playable(table, c)}
              className={c.suit === 1 || c.suit === 2 ? "card red" : "card"}
              onClick={() =>
                c.rank === 8 ? setEight(i) : move({ k: "play", i })
              }
            >
              {label(c)}
            </button>
          ))}
        </div>
      )}
      <div className="game-row">
        {!table.winner && (
          <button
            type="button"
            disabled={!mine}
            onClick={() => move({ k: "draw" })}
          >
            Draw
          </button>
        )}
        <button type="button" onClick={leaveTable}>
          {table.winner ? "Done" : "Leave the table"}
        </button>
      </div>
    </section>
  );
}
