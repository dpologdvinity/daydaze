// Loft Studios' instrument panel: pick a station and play its eight notes by
// button or the 1 to 8 keys. The key listener is always on while the panel is
// mounted, except while typing in a field.

import { useEffect, type JSX } from "react";
import {
  DRUM_LABELS,
  INSTRUMENT_LABELS,
  NOTE_NAMES,
} from "../../../audio/instrumentSynths.ts";
import { STATIONS, isStation } from "../../../game/studio.ts";
import { typing } from "../shared/useNow.ts";
import { pick, play, studio } from "./session.ts";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];

/** Pick an instrument and play its eight notes, or press 1 to 8. */
export function StudioPanel(): JSX.Element {
  const { station } = studio.use();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      const note = KEYS.indexOf(e.key);
      if (note >= 0) play(note);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const labels = station === "drums" ? DRUM_LABELS : NOTE_NAMES;
  return (
    <section className="game-panel" aria-label="Instruments">
      <div className="venue-games" role="group" aria-label="Instrument">
        {Object.keys(STATIONS)
          .filter(isStation)
          .map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={station === id}
              onClick={() => pick(id)}
            >
              {INSTRUMENT_LABELS[id]}
            </button>
          ))}
      </div>
      <div className="venue-games" role="group" aria-label="Notes">
        {labels.slice(0, 8).map((label, i) => (
          <button key={i} type="button" onClick={() => play(i)}>
            {label}
          </button>
        ))}
      </div>
      <p className="game-call">Keys 1 to 8 play too.</p>
    </section>
  );
}
