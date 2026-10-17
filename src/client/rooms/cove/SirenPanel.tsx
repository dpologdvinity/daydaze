import { useEffect, type JSX } from "react";
import { SHELLS } from "../../../game/sirenSong.ts";
import { typing } from "../shared/useNow.ts";
import { leave, SHELL_COLORS, singShell, siren, start } from "./session.ts";

const NAMES = ["Pink", "Blue", "Gold", "Violet"];

/** Siren Song: listen to the mermaids, then sing it back on the shells
 * (or keys 1 to 4). */
export function SirenPanel(): JSX.Element {
  const s = siren.use();
  const playing = s.phase !== "off";
  useEffect(() => {
    if (s.phase !== "sing") return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const n = Number(e.key) - 1;
      if (n >= 0 && n < SHELLS) singShell(performance.now(), n);
      else if (e.code === "Escape") leave();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [s.phase]);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Siren Song">
        <p className="game-call">
          The mermaids sing on the shells. Sing it back, one note longer each
          round.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Sing with the mermaids
        </button>
      </section>
    );
  return (
    <section className="game-panel" aria-label="Siren Song">
      <p className="game-score" aria-label="Rounds">
        <span>{s.song.rounds} rounds</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `The song's over: ${s.song.rounds} rounds`
          : s.phase === "listen"
            ? "Listen…"
            : `Your turn: ${s.song.rounds + 1} notes`}
      </p>
      <div className="shell-pads">
        {SHELL_COLORS.map((color, i) => (
          <button
            key={color}
            type="button"
            className="shell-pad"
            aria-label={`${NAMES[i]} shell`}
            data-lit={s.lit === i}
            style={{ color }}
            disabled={s.phase !== "sing"}
            onClick={() => singShell(performance.now(), i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {s.phase === "over" && (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Sing again
        </button>
      )}
      <button type="button" className="game-leave" onClick={leave}>
        Leave the shells
      </button>
    </section>
  );
}
