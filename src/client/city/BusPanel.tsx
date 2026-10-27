// The nearest stop's arrival sign and the passenger's accessible ride controls.
import { BUS_STOPS } from "../../game/city/transit.ts";
import { busMotion, busRide } from "./busRide.ts";
export function BusPanel() {
  const s = busRide.use();
  if (!s.riding && s.near < 0) return null;
  const name =
    BUS_STOPS[s.riding ? (s.stop >= 0 ? s.stop : s.next) : s.near].name;
  const here = s.stop === s.near;
  return (
    <section className="game-panel bus-panel" aria-label="City bus">
      <p className="game-score">Line 1 · {name}</p>
      <p role="status">
        {s.riding
          ? s.stop >= 0
            ? "At the stop · doors open"
            : `Next stop: ${name}`
          : here
            ? "Bus here · doors open"
            : `Next bus in ${s.eta} s`}
      </p>
      <button
        type="button"
        className="game-main"
        disabled={s.riding ? s.stop < 0 : !here}
        onClick={() => {
          busMotion.request = s.riding ? "leave" : "board";
        }}
      >
        {s.riding ? "Get off" : "Ride the bus"}
      </button>
      {s.riding && (
        <p>Stay seated while the bus is moving. Get off at any stop.</p>
      )}
    </section>
  );
}
