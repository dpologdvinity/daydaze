import { useEffect, useState, type JSX } from "react";
import { hudOf, type Hud } from "../../../game/speedway/session.ts";
import { SPEEDWAY_SPOTS } from "../../../game/speedway/spots.ts";
import { driving } from "../../world/driving.ts";

/** m:ss.cc, the lap clock's format. */
export function formatLap(ms: number): string {
  const hundredths = Math.max(0, Math.floor(ms / 10));
  const m = Math.floor(hundredths / 6000);
  const s = Math.floor(hundredths / 100) % 60;
  return `${m}:${String(s).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** The drive's HUD numbers, read ten times a second; null when on foot. */
export function useHud(): Hud | null {
  const [hud, setHud] = useState<Hud | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = driving.session;
      setHud(s ? hudOf(s) : null);
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return hud;
}

/** The race or bumper car readout, in the top corner while driving. */
export function RaceHud(): JSX.Element | null {
  const hud = useHud();
  if (!hud) return null;
  if (hud.phase === "bumpers") {
    return (
      <section className="race-hud" aria-label="Bumper cars">
        <p>Bumps {hud.hits}</p>
      </section>
    );
  }
  return (
    <section className="race-hud" aria-label="Race">
      <p>
        Lap {Math.max(1, hud.lap)} of {hud.laps}
      </p>
      <p>
        Place {hud.place} of {hud.field}
      </p>
      <p role="timer" aria-label="Lap time">
        {formatLap(hud.lapMs)}
      </p>
      <p>Best {hud.bestMs === null ? "--" : formatLap(hud.bestMs)}</p>
      {hud.phase === "countdown" && <p role="status">Get ready</p>}
      {hud.phase === "finished" && <p role="status">Finished</p>}
    </section>
  );
}

/** Walk-up choices for the Speedway, shown while on foot. */
export function SpeedwayMenu(): JSX.Element | null {
  const hud = useHud();
  if (hud) return null;
  return (
    <section className="speedway-menu" aria-label="Speedway activities">
      {SPEEDWAY_SPOTS.map((spot) => (
        <button
          type="button"
          key={spot.id}
          onClick={() => {
            driving.request = spot.id;
          }}
        >
          {spot.label}
        </button>
      ))}
    </section>
  );
}
