import type { JSX } from "react";
import { huntScore, SPECIES } from "../../../game/safari.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { leave, press, safari, secondsLeft, start } from "./session.ts";

const label = (id: string) => SPECIES.find((s) => s.id === id)?.label ?? id;

/** Safari photo hunt: four animals to photograph in two minutes. */
export function SafariPanel(): JSX.Element {
  const s = safari.use();
  const now = useNow(s.on && !s.over);
  usePressKeys(s.on && !s.over, (t) => press(t), leave);
  if (!s.on)
    return (
      <section className="game-panel" aria-label="Safari photo hunt">
        <p className="game-call">
          Four animals, two minutes. Walk the paths, face an animal on your list
          and snap. Closer shots score more.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Start a photo hunt
        </button>
      </section>
    );
  const shot = new Set(s.hunt.shots.map((x) => x.kind));
  const left = Math.max(0, Math.ceil(secondsLeft(now)));
  return (
    <section className="game-panel" aria-label="Safari photo hunt">
      <p className="game-score" aria-label="Score">
        <span>{huntScore(s.hunt)} points</span>
        <span>{s.over ? "Done" : `${left} s`}</span>
      </p>
      <ul aria-label="Your list" className="safari-list">
        {s.hunt.list.map((kind) => (
          <li key={kind} data-got={shot.has(kind)}>
            {shot.has(kind) ? "✓ " : ""}
            {label(kind)}
          </li>
        ))}
      </ul>
      <p className="game-call" role="status">
        {s.over
          ? `Hunt over: ${s.final} points.`
          : (s.last ?? "Face an animal on your list and snap.")}
      </p>
      <div className="game-row">
        {!s.over && (
          <button
            type="button"
            className="game-main"
            onClick={() => press(performance.now())}
          >
            Snap
          </button>
        )}
        <button type="button" onClick={leave}>
          {s.over ? "Done" : "Stop"}
        </button>
      </div>
    </section>
  );
}
