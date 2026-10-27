// The dive shack's counter at Seaside Swim: rent the scuba gear (tank and
// mask go on her), return it, and a pointer to the dive buoy. The rental is a
// store, so the city's door (App's travel) can tell whether she may go down.

import type { JSX } from "react";
import { scuba } from "../../avatar/human/afloat.ts";

export function ShackPanel(): JSX.Element {
  const gear = scuba.use();
  return (
    <section className="game-panel" aria-label="Dive shack">
      <p className="game-call">
        {gear.rented
          ? "Tank and mask are on. Swim out to the red dive buoy and swim into it to go down."
          : "Rent a tank and mask, then swim out to the red dive buoy. The reef is a short way down."}
      </p>
      {gear.rented ? (
        <button
          type="button"
          className="game-main"
          onClick={() => scuba.set({ rented: false, wearing: false })}
        >
          Return the gear
        </button>
      ) : (
        <button
          type="button"
          className="game-main"
          onClick={() => scuba.set({ rented: true, wearing: true })}
        >
          Rent scuba gear
        </button>
      )}
    </section>
  );
}
