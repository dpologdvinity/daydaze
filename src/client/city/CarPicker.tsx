import type { JSX } from "react";
import { CAR_PAINTS, type ParkedCar } from "../../game/city/drive.ts";
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
    </div>
  );
}
