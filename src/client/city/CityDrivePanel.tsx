import type { JSX } from "react";
import { DriveControls } from "../rooms/speedway/DriveControls.tsx";
import { useHud } from "../rooms/speedway/RaceHud.tsx";

const MPH = 2.23694;

/** While you drive in the city: the speedometer and the car's controls. */
export function CityDrivePanel(): JSX.Element {
  const hud = useHud();
  return (
    <>
      {hud?.phase === "city" && (
        <section className="race-hud city-speed" aria-label="Speedometer">
          <p>
            {Math.round(Math.abs(hud.speed) * MPH)} mph
            {hud.speed < -0.1 ? " (reverse)" : ""}
          </p>
        </section>
      )}
      <DriveControls />
    </>
  );
}
