import { useEffect, type JSX } from "react";
import { nextStation, STATIONS } from "../../audio/carRadio.ts";
import { playHorn } from "../../audio/worldSounds.ts";
import { ignoresKeys } from "../world/keyTargets.ts";
import { carExtras } from "./carExtras.ts";
import { DriveControls } from "../rooms/speedway/DriveControls.tsx";
import { useHud } from "../rooms/speedway/RaceHud.tsx";

const MPH = 2.23694;

/** While you drive in the city: the speedometer and the car's controls. */
export function CityDrivePanel(): JSX.Element {
  const hud = useHud();
  const inCar = hud?.phase === "city";
  const { station, lights } = carExtras.use();
  // out of the car, the radio goes off; H honks while you drive
  useEffect(() => {
    if (!inCar) {
      carExtras.set({ station: null, lights: false });
      return;
    }
    const key = (e: KeyboardEvent) => {
      if (e.code !== "KeyH" || e.repeat || ignoresKeys(e.target, e.code))
        return;
      playHorn();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [inCar]);
  const tuned = STATIONS.find((s) => s.track === station);
  return (
    <>
      {hud?.phase === "city" && (
        <section className="race-hud city-speed" aria-label="Speedometer">
          <p>
            {Math.round(Math.abs(hud.speed) * MPH)} mph
            {hud.speed < -0.1 ? " (reverse)" : ""}
          </p>
          <p className="fuel" data-low={hud.fuel < 0.15}>
            Gas {Math.round(hud.fuel * 100)}%
            {hud.fuel <= 0 ? ": empty, coast to a pump" : ""}
          </p>
        </section>
      )}
      {inCar && (
        <div className="car-extras" role="group" aria-label="In the car">
          <button type="button" onClick={() => playHorn()}>
            Horn (H)
          </button>
          <button
            type="button"
            onClick={() => carExtras.set({ station: nextStation(station) })}
          >
            Radio: {tuned?.label ?? "off"}
          </button>
          <button
            type="button"
            aria-pressed={lights}
            onClick={() => carExtras.set({ lights: !lights })}
          >
            Headlights
          </button>
        </div>
      )}
      <DriveControls />
    </>
  );
}
