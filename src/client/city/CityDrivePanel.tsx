// The HUD while driving your own car in the city: speedometer in mph, the gas
// gauge, horn (H), radio and headlights. Leaving the car turns the radio and
// headlights off.

import { useEffect, type JSX } from "react";
import { nextStation, STATIONS } from "../../audio/carRadio.ts";
import { engineMix } from "../../audio/engineMix.ts";
import { playSoundFile, setLoop } from "../../audio/soundFiles.ts";
import { ignoresKeys } from "../world/keyTargets.ts";
import { carExtras } from "./carExtras.ts";
import { DriveControls } from "../rooms/speedway/DriveControls.tsx";
import { useHud } from "../rooms/speedway/RaceHud.tsx";

const MPH = 2.23694;
/** Meters per second the fastest road car tops out at (game/driving/roster.ts). */
const TOP_SPEED = 52;

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
      void playSoundFile("horn");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [inCar]);
  // the engine and tires, shaped by how fast you go; silent when out of the car
  const speed = inCar ? Math.abs(hud.speed) / TOP_SPEED : 0;
  useEffect(() => {
    if (!inCar) {
      setLoop("car-engine", 0);
      setLoop("tire-hum", 0);
      return;
    }
    const mix = engineMix(speed);
    setLoop("car-engine", mix.engine.level, mix.engine.rate);
    setLoop("tire-hum", mix.tire.level);
  }, [inCar, speed]);
  useEffect(
    () => () => {
      setLoop("car-engine", 0);
      setLoop("tire-hum", 0);
    },
    [],
  );
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
          <button type="button" onClick={() => void playSoundFile("horn")}>
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
