// The water-gun battle's panel: points, squirts left and the clock, an aim
// pad and the Squirt button. The battle itself is on the pool (WaterGuns.tsx):
// aim with the mouse over the water, a tap, the arrow keys or the pad, and
// squirt with a click, a tap, Space or the button.

import { useEffect, type JSX } from "react";
import { typing, useNow, usePressKeys } from "../shared/useNow.ts";
import {
  fire,
  leave,
  nudge,
  secondsLeft,
  start,
  tick,
  waterGuns,
} from "./waterGunSession.ts";

/** How far one arrow press moves the aim, m. */
const STEP = 0.6;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, -STEP],
  ArrowDown: [0, STEP],
};

/** Soak the floaties bobbing across the pool before the tank runs dry. */
export function WaterGunPanel(): JSX.Element {
  const s = waterGuns.use();
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
  if (s.phase === "off")
    return (
      <section className="game-panel" aria-label="Water-gun battle">
        <p className="game-call">
          Soak the floaties bobbing across the pool before your tank runs dry.
          Aim over the water and click, or use the arrows and Space.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Grab a water gun
        </button>
      </section>
    );
  const soaked = s.shot?.soaked;
  return (
    <section className="game-panel" aria-label="Water-gun battle">
      <p className="game-score" aria-label="Score">
        <span>{s.battle.score} points</span>
        <span>
          {s.battle.water} squirts · {playing ? secondsLeft(now) : 0} s
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Battle over: ${s.battle.score} points.`
          : s.shot
            ? soaked
              ? `Soaked a ${soaked.kind === "can" ? "ring" : soaked.kind}!`
              : "Splash. Missed!"
            : "Aim at a floatie and squirt."}
      </p>
      {playing ? (
        <>
          <div className="game-row" role="group" aria-label="Aim">
            <button type="button" onClick={() => nudge(-STEP, 0)}>
              ◀ Left
            </button>
            <button type="button" onClick={() => nudge(0, -STEP)}>
              ▲ Farther
            </button>
            <button type="button" onClick={() => nudge(0, STEP)}>
              ▼ Nearer
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
            Squirt!
          </button>
        </>
      ) : (
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Battle again
        </button>
      )}
      <button type="button" onClick={leave}>
        Put the gun down
      </button>
    </section>
  );
}
