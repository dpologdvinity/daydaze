import type { JSX } from "react";
import { CASTS, tripKg, type Catch } from "../../../game/fishing.ts";
import { useNow, usePressKeys } from "../shared/useNow.ts";
import { fishing, leave, powerAt, press, start } from "./session.ts";

const ACTION: Record<string, string> = {
  power: "Cast",
  flying: "…",
  waiting: "Strike!",
  bite: "Strike!",
  result: "…",
  over: "Fish again",
};

function call(c: Catch): string {
  if (c.outcome === "early") return "Too soon: you spooked it.";
  if (c.outcome === "lost") return `A ${c.species} got away!`;
  return `${c.species}, ${c.kg} kg!`;
}

/** Five casts off the dock: set the power, then strike the moment the
 * bobber dips. */
export function FishingPanel(): JSX.Element {
  const s = fishing.use();
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "power");
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Fishing">
        <p className="game-call">
          Five casts off the end of the dock. Strike when the bobber dips.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => start(performance.now())}
        >
          Go fishing
        </button>
      </section>
    );
  return (
    <section className="game-panel" aria-label="Fishing">
      <p className="game-score" aria-label="Catch">
        <span>{tripKg(s.trip)} kg</span>
        <span>
          {Math.min(
            s.trip.catches.length + (s.phase === "over" ? 0 : 1),
            CASTS,
          )}
          /{CASTS}
        </span>
      </p>
      <p className="game-call" role="status">
        {s.phase === "over"
          ? `Trip done: ${tripKg(s.trip)} kg`
          : s.phase === "bite"
            ? "It's biting!"
            : s.phase === "waiting"
              ? "Wait for it…"
              : s.phase === "result" && s.last
                ? call(s.last)
                : ""}
      </p>
      <label className="game-meter">
        Cast
        <meter
          min={0}
          max={1}
          value={s.phase === "power" ? powerAt(now, s.since) : s.power}
        />
      </label>
      <button
        type="button"
        className="game-main"
        data-bite={s.phase === "bite"}
        disabled={s.phase === "flying" || s.phase === "result"}
        onClick={() => press(performance.now(), s.phase)}
      >
        {ACTION[s.phase]}
      </button>
      <button type="button" className="game-leave" onClick={leave}>
        Reel in and leave
      </button>
    </section>
  );
}
