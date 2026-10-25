// Photon Zone's target-range panel: pick a pistol or rifle drill, then the
// points, shots left and clock, an aim pad and Fire. The drill itself runs
// on the arena's north wall (Range.tsx): aim with the mouse over the wall,
// a tap, the arrow keys or the pad; fire with a click, tap, Space or Fire.

import { useEffect, type JSX } from "react";
import type { Gun } from "../../../game/targetRange.ts";
import { typing, useNow, usePressKeys } from "../shared/useNow.ts";
import {
  fire,
  leave,
  nudge,
  range,
  secondsLeft,
  start,
  tick,
} from "./rangeSession.ts";

const DRILLS: readonly { id: Gun; label: string; blurb: string }[] = [
  { id: "pistol", label: "Pistol drill", blurb: "More shots, wider beam." },
  {
    id: "rifle",
    label: "Rifle drill",
    blurb: "Fewer shots, a tight beam, faster targets.",
  },
];
const STEP = 0.4;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, STEP],
  ArrowDown: [0, -STEP],
};

/** Photon Zone's light-gun range: timed drills on the north wall. */
export function RangePanel(): JSX.Element {
  // switching to another game (or leaving the room) ends this one
  useEffect(() => () => leave(), []);
  const s = range.use();
  const playing = s.phase === "playing";
  const now = useNow(playing);
  useEffect(() => tick(now), [now]);
  usePressKeys(playing, fire, leave);
  useEffect(() => {
    if (!playing) return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const step = ARROWS[e.code];
      if (!step) return;
      e.preventDefault();
      nudge(step[0], step[1]);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [playing]);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Target range">
        <p className="game-call" role="status">
          {s.phase === "over"
            ? `${s.drill.gun === "rifle" ? "Rifle" : "Pistol"} drill: ${s.drill.score} points.`
            : "Light guns only: targets slide along the wall, and a hit lights them up."}
        </p>
        {DRILLS.map((d) => (
          <button
            key={d.id}
            type="button"
            className="game-main"
            title={d.blurb}
            onClick={() => start(d.id, performance.now())}
          >
            {d.label}
          </button>
        ))}
        {s.phase === "over" && (
          <button type="button" onClick={leave}>
            Holster it
          </button>
        )}
      </section>
    );
  const lit = s.shot?.lit;
  return (
    <section className="game-panel" aria-label="Target range">
      <p className="game-score" aria-label="Score">
        <span>{s.drill.score} points</span>
        <span>
          {s.drill.shots} shots · {secondsLeft(now)} s
        </span>
      </p>
      <p className="game-call" role="status">
        {s.shot
          ? lit
            ? `Lit up a ${lit.kind}!`
            : "Missed."
          : "Aim at a target and fire."}
      </p>
      <div className="game-row" role="group" aria-label="Aim">
        <button type="button" onClick={() => nudge(-STEP, 0)}>
          ◀ Left
        </button>
        <button type="button" onClick={() => nudge(0, STEP)}>
          ▲ Up
        </button>
        <button type="button" onClick={() => nudge(0, -STEP)}>
          ▼ Down
        </button>
        <button type="button" onClick={() => nudge(STEP, 0)}>
          Right ▶
        </button>
      </div>
      <button
        type="button"
        className="game-main"
        onClick={() => fire(performance.now())}
      >
        Fire!
      </button>
      <button type="button" onClick={leave}>
        Holster it
      </button>
    </section>
  );
}
