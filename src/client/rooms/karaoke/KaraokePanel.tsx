import { useEffect, type JSX } from "react";
import { LANES, NOTES, songScore } from "../../../game/karaokeGame.ts";
import { typing, useNow } from "../shared/useNow.ts";
import { karaoke, leave, nextNote, singOn, start, tick } from "./session.ts";

const LANE_NAMES = ["Low", "Mid", "High"] as const;
const KEYS: Record<string, number> = { KeyJ: 0, KeyK: 1, KeyL: 2 };

const CALL = {
  perfect: "Perfect pitch!",
  good: "Nice",
  early: "Too early",
  late: "Missed it",
} as const;

/** The mic: the melody comes down three lanes; sing each one on time. */
export function KaraokePanel(): JSX.Element {
  const s = karaoke.use();
  const singing = s.phase === "singing";
  const now = useNow(singing);
  useEffect(() => tick(now), [now]);
  useEffect(() => {
    if (!singing) return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.repeat) return;
      const lane = KEYS[e.code];
      if (lane !== undefined) singOn(lane, performance.now());
      else if (e.code === "Escape") leave();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [singing]);
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Karaoke">
        <p className="game-call">
          Take the mic. The melody comes down three lanes: sing each note on its
          lane as it reaches the line (J, K, L).
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Sing a song
        </button>
      </section>
    );
  const next = singing ? nextNote() : null;
  const coming = next
    ? Math.max(0, Math.min(1, 1 - (next.due - now) / 1200))
    : 0;
  return (
    <section className="game-panel" aria-label="Karaoke">
      <p className="game-score" aria-label="Score">
        <span>{songScore(s.song)} points</span>
        <span>
          Note {Math.min(s.song.length + (singing ? 1 : 0), NOTES)}/{NOTES}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Song done: ${songScore(s.song)} points`
          : s.last
            ? s.last.lane ||
              !(s.last.swing === "perfect" || s.last.swing === "good")
              ? CALL[s.last.swing]
              : "Wrong note!"
            : "Here comes the first note…"}
      </p>
      {next && (
        <label className="game-meter">
          Next: {LANE_NAMES[next.note.lane]}
          <meter min={0} max={1} high={0.9} optimum={1} value={coming} />
        </label>
      )}
      {singing ? (
        <div className="game-row" role="group" aria-label="Sing">
          {Array.from({ length: LANES }, (_, lane) => (
            <button
              key={lane}
              type="button"
              className="game-main"
              onClick={() => singOn(lane, performance.now())}
            >
              {LANE_NAMES[lane]}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Sing again
        </button>
      )}
      <button type="button" onClick={leave}>
        Put the mic down
      </button>
    </section>
  );
}
