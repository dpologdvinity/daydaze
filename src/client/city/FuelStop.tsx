// The gas pump prompt: polls the city drive session every 200 ms and, with the
// car stopped (under 0.5 m/s) at a station and the tank not full, offers a full
// fill-up for coins.

import { useEffect, useState, type JSX } from "react";
import { fillCost, stationAt } from "../../game/city/gasStations.ts";
import { driving } from "../world/driving.ts";

type Stop = { name: string; cost: number };

/** At a pump with the car stopped: fill the tank for coins. */
export function FuelStop({
  coins,
  onSpend,
}: {
  coins: number;
  /** Takes `price` coins; false when you can't afford it. */
  onSpend: (price: number) => boolean;
}): JSX.Element | null {
  const [stop, setStop] = useState<Stop | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = driving.session;
      const station =
        s?.kind === "city" && Math.abs(s.car.speed) < 0.5 && s.fuel < 0.995
          ? stationAt(s.car.position)
          : null;
      setStop((prev) => {
        if (!station || s?.kind !== "city") return null;
        const cost = fillCost(s.fuel);
        return prev?.name === station.name && prev.cost === cost
          ? prev
          : { name: station.name, cost };
      });
    }, 200);
    return () => window.clearInterval(id);
  }, []);
  if (!stop) return null;
  const short = coins < stop.cost;
  return (
    <section className="fuel-stop" aria-label={`Pump at ${stop.name}`}>
      <button
        type="button"
        disabled={short}
        onClick={() => {
          const s = driving.session;
          if (s?.kind === "city" && onSpend(stop.cost)) s.fuel = 1;
        }}
      >
        Fill up: {stop.cost} coins
      </button>
      {short && <p>Not enough coins for a full tank.</p>}
    </section>
  );
}
