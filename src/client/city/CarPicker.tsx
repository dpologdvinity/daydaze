import { useState, type JSX } from "react";
import {
  CAR_PAINTS,
  RIMS,
  TINTS,
  WRAPS,
  UNDERGLOWS,
  type ParkedCar,
} from "../../game/city/drive.ts";
import { ROAD_CARS } from "../../game/driving/roster.ts";
import { driving } from "../world/driving.ts";

/** The dock's car controls in the city: pick your ride and its paint, then
 * Drive walks you over to it and puts you behind the wheel. */
export function CarPicker({
  car,
  garage,
  onChange,
}: {
  car: ParkedCar;
  /** The cars you own: only these are on the list. */
  garage: readonly string[];
  onChange: (car: ParkedCar) => void;
}): JSX.Element {
  // the custom-shop picks stay tucked away until asked for
  const [shop, setShop] = useState(false);
  return (
    <div className="car-picker" role="group" aria-label="Your car">
      <button
        type="button"
        className="drink"
        onClick={() => (driving.request = "city-drive")}
      >
        Drive your car
      </button>
      <select
        aria-label="Car"
        value={car.id}
        onChange={(e) => onChange({ ...car, id: e.target.value })}
      >
        {ROAD_CARS.filter((c) => garage.includes(c.id)).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.class})
          </option>
        ))}
      </select>
      <select
        aria-label="Paint"
        value={car.color}
        onChange={(e) => onChange({ ...car, color: e.target.value })}
      >
        {CAR_PAINTS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="drink"
        aria-expanded={shop}
        onClick={() => setShop(!shop)}
      >
        Customize
      </button>
      {shop && (
        <>
          <select
            aria-label="Rims"
            value={car.rims ?? RIMS[0].id}
            onChange={(e) => onChange({ ...car, rims: e.target.value })}
          >
            {RIMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Underglow"
            value={car.glow ?? UNDERGLOWS[0].id}
            onChange={(e) => onChange({ ...car, glow: e.target.value })}
          >
            {UNDERGLOWS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Window tint"
            value={car.tint ?? TINTS[0].id}
            onChange={(e) => onChange({ ...car, tint: e.target.value })}
          >
            {TINTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Wrap"
            value={car.wrap ?? WRAPS[0].id}
            onChange={(e) => onChange({ ...car, wrap: e.target.value })}
          >
            {WRAPS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
