// The Water Park's cliff-dive panel: pick a trick, then stop the entry meter
// near its middle, five dives a set. The game state lives in divingSession.ts;
// this panel only renders it and forwards presses (button, or the keys from
// usePressKeys).

import { useEffect, type JSX } from "react";
import { DIVES, TRICKS, total } from "../../../game/cliffDive.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import {
  diving,
  entryNow,
  leave,
  pick,
  press,
  start,
  tick,
} from "./divingSession.ts";

const CALL = {
  rip: "A rip entry! Barely a ripple.",
  clean: "Clean entry.",
  splash: "Big splash.",
  flop: "Belly flop!",
} as const;

/** Off the tower: five dives, a trick each, stop the entry meter dead center. */
export function DivePanel(): JSX.Element {
  const s = diving.use();
  const playing = s.phase !== "off";
  const now = useNow(
    s.phase === "climb" || s.phase === "entry" || s.phase === "splash",
  );
  useEffect(() => tick(now), [now]);
  usePressKeys(s.phase === "entry", (t) => press(t), leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Cliff dive">
        <p className="game-call">
          Five dives off the tower. Harder tricks score more, but the entry
          meter runs faster: stop it in the middle.
        </p>
        <button type="button" className="game-main" onClick={start}>
          Climb the tower
        </button>
      </section>
    );
  const last = s.dives[s.dives.length - 1];
  return (
    <section className="game-panel" aria-label="Cliff dive">
      <p className="game-score" aria-label="Score">
        <span>{total(s.dives)} points</span>
        <span>
          Dive {Math.min(s.dives.length + (s.phase === "over" ? 0 : 1), DIVES)}/
          {DIVES}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Set done: ${total(s.dives)} points`
          : s.phase === "splash" && last
            ? `${CALL[last.entry]} +${last.points}`
            : s.phase === "climb"
              ? "Climbing the tower…"
              : s.phase === "pick"
                ? "Pick your trick."
                : "Stop the meter in the middle."}
      </p>
      {s.phase === "pick" && (
        <div className="game-row" role="group" aria-label="Tricks">
          {TRICKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id, performance.now())}
            >
              {t.label} ×{t.difficulty}
            </button>
          ))}
        </div>
      )}
      {s.phase === "entry" && (
        <>
          <label className="game-meter">
            Entry
            <meter
              min={0}
              max={1}
              low={0.35}
              high={0.65}
              optimum={0.5}
              value={entryNow(now)}
            />
          </label>
          <button
            type="button"
            className="game-main"
            onClick={() => press(performance.now())}
          >
            Dive!
          </button>
        </>
      )}
      {s.phase === "over" && (
        <button type="button" className="game-main" onClick={start}>
          Dive again
        </button>
      )}
      <button type="button" onClick={leave}>
        Climb down
      </button>
    </section>
  );
}
