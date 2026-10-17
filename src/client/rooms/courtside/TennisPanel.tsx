import type { JSX } from "react";
import { POINTS, pointsWon } from "../../../game/tennis.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { leave, press, start, tennis } from "./session.ts";

const CALL = {
  winner: "Winner!",
  rally: "Nice return",
  lost: "Point to the pro",
} as const;

/** Seven points against the pro: swing as the ball reaches you. */
export function TennisPanel(): JSX.Element {
  const s = tennis.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "incoming");
  usePressKeys(playing, (t) => press(t), leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Tennis">
        <p className="game-call">
          Seven points against the club pro. Swing as the ball reaches you.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Play a match
        </button>
      </section>
    );
  const won = pointsWon(s.match);
  const lost = s.match.points.length - won;
  const coming =
    s.phase === "incoming"
      ? Math.max(0, Math.min(1, 1 - (s.arrives - now) / 1500))
      : 0;
  return (
    <section className="game-panel" aria-label="Tennis">
      <p className="game-score" aria-label="Score">
        <span>
          You {won} · Pro {lost}
        </span>
        <span>
          {Math.min(s.match.points.length + 1, POINTS)}/{POINTS}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Match done: ${won} of ${POINTS}`
          : s.last
            ? s.last.outcome === "lost"
              ? s.last.swing === "early"
                ? "Too early!"
                : "Too late!"
              : CALL[s.last.outcome]
            : ""}
      </p>
      <label className="game-meter">
        Ball
        <meter min={0} max={1} high={0.9} optimum={1} value={coming} />
      </label>
      <button
        type="button"
        className="game-main"
        disabled={s.phase !== "incoming" && s.phase !== "over"}
        onClick={() => press(performance.now(), s.phase)}
      >
        {s.phase === "over" ? "Play again" : "Swing!"}
      </button>
      <button type="button" className="game-leave" onClick={leave}>
        Leave the court
      </button>
    </section>
  );
}
