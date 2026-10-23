import { useState, type JSX } from "react";
import { CardTable } from "../../ui/CardTable.tsx";

/** Odette keeps a deck behind the bar for Crazy Eights between pours. */
export function CardsPanel(): JSX.Element {
  const [playing, setPlaying] = useState(false);
  if (playing)
    return (
      <CardTable
        rival="Odette"
        winLine="You win! Odette shuffles for another."
        onClose={() => setPlaying(false)}
      />
    );
  return (
    <section className="game-panel" aria-label="Crazy Eights">
      <p className="game-call">
        Five cards each. Match the suit or the rank; eights are wild.
      </p>
      <button
        type="button"
        className="game-main"
        onClick={() => setPlaying(true)}
      >
        Deal in with Odette
      </button>
    </section>
  );
}
