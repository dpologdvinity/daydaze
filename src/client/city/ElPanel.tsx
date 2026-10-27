// The El's buttons in the dock: near a station's stairs, a trip to each of the
// other stations; while waiting or riding, where you are headed and a way out.

import { useEffect, useState, type JSX } from "react";
import { EL_STATIONS } from "../../game/city/el.ts";
import { elClock } from "./elLayout.ts";
import { elRide } from "./elStore.ts";

const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ElPanel(): JSX.Element | null {
  const { status, near } = elRide.use();
  const [now, setNow] = useState(elClock());
  useEffect(() => {
    if (status.kind === "idle") return;
    const id = setInterval(() => setNow(elClock()), 500);
    return () => clearInterval(id);
  }, [status.kind]);
  if (status.kind === "waiting" || status.kind === "riding") {
    const { trip } = status;
    return (
      <div className="dock-actions" role="group" aria-label="The El">
        <span className="drink">
          {status.kind === "waiting"
            ? `The El to ${trip.to.name} in ${clock(trip.board - now)}`
            : `Riding to ${trip.to.name}, ${clock(trip.arrive - now)}`}
        </span>
        <button
          type="button"
          className="drink"
          onClick={() => elRide.set({ request: "cancel" })}
        >
          Get off
        </button>
      </div>
    );
  }
  if (!near) return null;
  return (
    <div className="dock-actions" role="group" aria-label="The El">
      {EL_STATIONS.filter((s) => s.id !== near.id).map((s) => (
        <button
          key={s.id}
          type="button"
          className="drink"
          onClick={() => elRide.set({ request: { to: s.id } })}
        >
          Ride the El to {s.name}
        </button>
      ))}
    </div>
  );
}
