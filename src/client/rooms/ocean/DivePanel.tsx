// The reef dive's readouts: an air gauge, the depth, and a checklist of the
// sea life she can spot (the goal is five kinds; the wreck counts for two).
// Everything comes from the dive store; the scene fills it in.

import type { JSX } from "react";
import {
  AIR_SECONDS,
  GOAL,
  SPECIES,
  airShare,
  gaugeOf,
  scoreOf,
} from "../../../game/dive.ts";
import { dive } from "./session.ts";

export function DivePanel(): JSX.Element {
  const s = dive.use();
  const gauge = gaugeOf(s.air);
  const found = s.log.seen.length;
  return (
    <section className="game-panel dive-panel" aria-label="Reef dive">
      <p className="game-score" aria-label="Dive">
        <span>Depth {s.depth.toFixed(0)} m</span>
        <span>Score {scoreOf(s.log)}</span>
      </p>
      <div
        className="air-gauge"
        role="meter"
        aria-label="Air"
        aria-valuemin={0}
        aria-valuemax={AIR_SECONDS}
        aria-valuenow={Math.round(s.air)}
        data-gauge={gauge}
      >
        <span style={{ width: `${airShare(s.air) * 100}%` }} />
        <b>{Math.ceil(s.air)} s of air</b>
      </div>
      <p className="game-call" role="status">
        {s.out
          ? "Out of air: heading up!"
          : s.last ||
            (found >= GOAL
              ? "Goal reached! Keep exploring for more."
              : `Spot ${GOAL} kinds of sea life: ${found}/${GOAL}. Swim toward them.`)}
      </p>
      <ul className="species-log" aria-label="Sea life">
        {SPECIES.map((sp) => (
          <li
            key={sp.id}
            data-seen={s.log.seen.includes(sp.id)}
            aria-label={`${sp.label}${s.log.seen.includes(sp.id) ? ", spotted" : ""}`}
          >
            {sp.label}
          </li>
        ))}
        <li data-seen={s.log.wreck}>The wreck</li>
      </ul>
    </section>
  );
}
