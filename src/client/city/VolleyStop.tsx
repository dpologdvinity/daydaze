import { useEffect, useState, type JSX } from "react";
import { VOLLEYBALL } from "../../game/city/layout.ts";
import type { PrizeGame } from "../../game/prizes.ts";
import { TO_WIN } from "../../game/volleyball.ts";
import { useNow, usePressKeys } from "../rooms/shared/useNow.ts";
import { driving } from "../world/driving.ts";
import { playerSpot } from "../world/playerSpot.ts";
import { leave, press, start, tick, volley } from "./volleySession.ts";

/** How close to the net the game offers itself, in meters. */
const NEAR = 9;

const CALL = {
  dug: "Dug it! Now spike",
  rally: "They dug your spike",
  kill: "Kill!",
  lost: "Their point",
} as const;

/** At the beach net on foot: first to seven against the pair across it. */
export function VolleyStop(): JSX.Element | null {
  const playing = volley.use().phase !== "off";
  const [near, setNear] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = Math.hypot(
        playerSpot.x - VOLLEYBALL.x,
        playerSpot.z - VOLLEYBALL.z,
      );
      setNear(d < NEAR && !driving.session);
    }, 300);
    return () => window.clearInterval(id);
  }, []);
  if (!playing && !near) return null;
  return <VolleyGame label="Beach volleyball" prize="volleyball" />;
}

/** A volleyball match's panel, for whichever court it's played on. */
export function VolleyGame({
  label,
  prize,
}: {
  label: string;
  prize: PrizeGame;
}): JSX.Element {
  const s = volley.use();
  const playing = s.phase !== "off";
  const now = useNow(playing && s.phase !== "over");
  useEffect(() => {
    if (playing) tick(now);
  }, [now, playing]);
  usePressKeys(playing, (t) => press(t), leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label={label}>
        <p className="game-call">
          First to {TO_WIN} against the pair across the net. Dig it as it
          reaches you, then spike the set at the top.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now(), prize)}
        >
          Play {label.toLowerCase()}
        </button>
      </section>
    );
  const { you, them, touch } = s.match;
  const coming =
    s.phase === "incoming"
      ? Math.max(0, Math.min(1, 1 - (s.arrives - now) / 1400))
      : 0;
  return (
    <section className="game-panel" aria-label={label}>
      <p className="game-score" aria-label="Score">
        <span>
          You {you} · Them {them}
        </span>
        <span>to {TO_WIN}</span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? you >= TO_WIN
            ? `You win, ${you} to ${them}!`
            : `They take it, ${them} to ${you}.`
          : s.last
            ? s.last.outcome === "lost"
              ? s.last.swing === "early"
                ? "Too early!"
                : "Too late!"
              : CALL[s.last.outcome]
            : "Here comes the serve"}
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
        {s.phase === "over"
          ? "Play again"
          : touch === "spike"
            ? "Spike!"
            : "Dig!"}
      </button>
      <button type="button" className="game-leave" onClick={leave}>
        Leave the court
      </button>
    </section>
  );
}
