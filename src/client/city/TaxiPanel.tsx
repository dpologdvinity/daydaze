// The taxi's dock button and ride card: "Hail a taxi" on a sidewalk, then the
// driver's words and a way out (or to skip the ride) until the trip is over.

import type { JSX } from "react";
import { taxiRide } from "./taxiStore.ts";

export function TaxiPanel(): JSX.Element | null {
  const { phase, canHail, line, fare } = taxiRide.use();
  if (phase === "idle") {
    if (!canHail) return null;
    return (
      <button
        type="button"
        className="drink"
        onClick={() => taxiRide.set({ request: "hail" })}
      >
        Hail a taxi
      </button>
    );
  }
  return (
    <div className="dock-actions" role="group" aria-label="Taxi">
      <span className="drink" role="status">
        {phase === "arriving"
          ? "A taxi is pulling up"
          : phase === "choosing"
            ? "Where to? Pick a place on the map"
            : `Riding · ${fare} coins`}
        {line && ` · "${line}"`}
      </span>
      {phase === "riding" && (
        <button
          type="button"
          className="drink"
          onClick={() => taxiRide.set({ request: "skip" })}
        >
          Skip the ride
        </button>
      )}
      {phase !== "riding" && (
        <button
          type="button"
          className="drink"
          onClick={() => taxiRide.set({ request: "cancel" })}
        >
          Never mind
        </button>
      )}
    </div>
  );
}
