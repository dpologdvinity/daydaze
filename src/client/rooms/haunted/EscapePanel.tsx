// The haunted house's escape game: three doors a room, one goes deeper and the
// others cost nerve with a scare line (jumps and creaks, never gore). Run state
// is local React state, so leaving the panel ends the run; the score goes to
// the prize desk when it finishes.

import { useState, type JSX } from "react";
import { playWhoosh } from "../../../audio/worldSounds.ts";
import {
  DEPTH,
  NERVE,
  newRun,
  open,
  runOver,
  runScore,
  type Run,
} from "../../../game/hauntedRun.ts";
import { award } from "../../ui/prizeDesk.ts";

const DOORS = ["Left door", "Door ahead", "Right door"] as const;

// What waits behind a wrong door: jumps and creaks, never gore.
const SCARES = [
  "A porcelain doll turns its head to watch you go.",
  "Something cold breathes on the back of your neck.",
  "A wardrobe door swings open on its own. Empty. Probably.",
  "The portrait's eyes were looking the other way a second ago.",
  "A music box starts playing, then stops mid-note.",
  "Footsteps upstairs match yours, one step behind.",
  "A sheet slides off a chair. Nobody's sitting there. Nobody you can see.",
  "Every candle in the room goes out at once.",
  "Wet handprints appear on the mirror, from the inside.",
  "A child's laugh, very close, then nothing.",
  "The door slams behind you and the knob turns by itself.",
  "A rocking chair keeps rocking long after you look away.",
];

/** Find the way out of the haunted house: three doors a room, one goes on. */
export function EscapePanel(): JSX.Element {
  const [run, setRun] = useState<Run | null>(null);
  const [scare, setScare] = useState<string | null>(null);
  if (!run)
    return (
      <section className="game-panel" aria-label="Find the way out">
        <p className="game-call">
          Find the way out: eight rooms, three doors each. One door goes on; the
          others hold a scare and cost you nerve.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => setRun(newRun(Math.floor(Math.random() * 1e9)))}
        >
          Step inside
        </button>
      </section>
    );
  const over = runOver(run);
  return (
    <section
      className="game-panel"
      aria-label="Find the way out"
      data-scared={scare !== null}
    >
      <p className="game-score" aria-label="Progress">
        <span>
          Room {Math.min(run.depth + 1, DEPTH)}/{DEPTH}
        </span>
        <span aria-label={`Nerve ${run.nerve} of ${NERVE}`}>
          {"♥".repeat(run.nerve)}
          {"♡".repeat(NERVE - run.nerve)}
        </span>
      </p>
      <p className="game-call" role="status">
        {over
          ? run.escaped
            ? `You're out! ${runScore(run)} points.`
            : "Your nerve gives out. You run for the front door."
          : (scare ??
            (run.depth === 0 ? "The front door creaks shut." : "Deeper in."))}
      </p>
      {!over && (
        <div className="game-row" role="group" aria-label="Doors">
          {DOORS.map((label, door) => (
            <button
              key={door}
              type="button"
              onClick={() => {
                const r = open(run, door);
                setRun(r.run);
                if (r.scared) {
                  playWhoosh();
                  setScare(
                    SCARES[
                      (run.seed + run.depth * 3 + run.nerve) % SCARES.length
                    ] ?? SCARES[0],
                  );
                } else setScare(null);
                if (runOver(r.run)) award("haunted", runScore(r.run));
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setRun(null)}>
        {over ? "Back to the hall" : "Run for it"}
      </button>
    </section>
  );
}
