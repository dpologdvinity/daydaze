// Reusable fishing panel for all spots: five casts, each set on a power meter
// and then struck when the bobber dips. Rules live in game/fishing.ts and state
// in ./session.ts; this only reads and presses.

import { useState, type JSX } from "react";
import {
  CASTS,
  FISHING_SPOTS,
  tripKg,
  type Catch,
  type FishingSpotId,
} from "../../../game/fishing.ts";
import { driving } from "../../world/driving.ts";
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

/** Five casts off the spot: set the power, then strike the moment the
 * bobber dips. */
export function FishingPanel({
  spot = "marina",
}: {
  spot?: FishingSpotId;
}): JSX.Element {
  const s = fishing.use();
  const [vehicleNotice, setVehicleNotice] = useState(false);
  const playing = s.phase !== "off";
  const now = useNow(s.phase === "power");
  const spotDef = FISHING_SPOTS[spot];
  usePressKeys(playing, press, leave);
  if (!playing)
    return (
      <section className="game-panel" aria-label="Fishing">
        <p className="game-call">
          {spotDef.description} Strike when the bobber dips.
        </p>
        {vehicleNotice && <p role="status">Leave the car before fishing.</p>}
        {vehicleNotice && driving.session && (
          <button
            type="button"
            onClick={() => {
              driving.request = "leave";
              setVehicleNotice(false);
            }}
          >
            Leave the car
          </button>
        )}
        <button
          type="button"
          className="game-main"
          onClick={() => setVehicleNotice(!start(performance.now(), spot))}
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

/** Fishing from the city pier. */
export function BoardwalkFishingPanel(): JSX.Element {
  return <FishingPanel spot="boardwalk" />;
}

/** Fishing from the Sunny Acres farm pond. */
export function FarmFishingPanel(): JSX.Element {
  return <FishingPanel spot="farm" />;
}

/** Fishing from the Larkspur Forest lake. */
export function ForestFishingPanel(): JSX.Element {
  return <FishingPanel spot="forest" />;
}

/** Fishing from the open-water boat. */
export function OpenWaterFishingPanel(): JSX.Element {
  return <FishingPanel spot="open-water" />;
}
