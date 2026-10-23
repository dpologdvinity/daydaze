import type { JSX } from "react";
import { driving } from "../../world/driving.ts";
import { DriveControls } from "../speedway/DriveControls.tsx";
import { RaceHud, useHud } from "../speedway/RaceHud.tsx";

/** The jet-ski rental: start a race round the buoys, then the race HUD and
 * the throttle and steering. */
export function JetSkiPanel(): JSX.Element {
  const hud = useHud();
  if (!hud)
    return (
      <section className="game-panel" aria-label="Jet-ski race">
        <p className="game-call">
          Three laps of the Harbor Run, round the buoys past the yachts, against
          five rivals. Throttle, brake and steer with the keys or the pedals.
        </p>
        <button
          type="button"
          className="game-main"
          onClick={() => (driving.request = "race-harbor")}
        >
          Race the Harbor Run
        </button>
      </section>
    );
  return (
    <>
      <RaceHud />
      <DriveControls />
    </>
  );
}
