import { useEffect, type JSX } from "react";
import { together } from "../../game/dance/together.ts";
import {
  answerTogether,
  listenForPairs,
  pairUp,
  stopTogether,
} from "./together.ts";

/** An emote with another player: their invite, your waiting, and the stop
 * button while you're in it. */
export function TogetherPanel(): JSX.Element | null {
  const s = pairUp.use();
  useEffect(() => listenForPairs(), []);
  if (s.invite)
    return (
      <section className="game-panel" aria-label="Emote invite">
        <p className="game-call">
          {s.invite.name} asks: {together(s.invite.e).label.toLowerCase()}?
        </p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answerTogether(true)}
          >
            Yes
          </button>
          <button type="button" onClick={() => answerTogether(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.asked)
    return (
      <section className="game-panel" aria-label="Emote invite">
        <p className="game-call" role="status">
          Waiting for {s.asked.name} to answer…
        </p>
        <button type="button" onClick={stopTogether}>
          Never mind
        </button>
      </section>
    );
  if (s.pair)
    return (
      <section className="game-panel" aria-label="Together">
        <p className="game-call" role="status">
          {together(s.pair.e).label} with {s.pair.name}.{" "}
          {together(s.pair.e).behind
            ? "Press Stop to hop down."
            : "Walk away to stop."}
        </p>
        <button type="button" onClick={stopTogether}>
          Stop
        </button>
      </section>
    );
  return s.note ? (
    <p className="notice" role="status">
      {s.note}
    </p>
  ) : null;
}
