// The always-mounted food HUD: the held tray with an eat or sip button, and the
// courier toast. It also runs the delivery clock every 250 ms, so orders land
// while the phone is closed.

import { useEffect, useSyncExternalStore } from "react";
import "./phone.css";
import { needLabel } from "../../../game/food/needs.ts";
import {
  clearToast,
  eatHeld,
  getFoodState,
  onFoodChange,
  tickDeliveries,
  tickNeeds,
  weedFelt,
} from "../../food/store.ts";

const TOAST_MS = 4000;
const TICK_MS = 250;

/**
 * The held tray and the courier's news. The live region stays mounted, so a
 * delivery is read out even when the tray is empty.
 */
export function FoodHud() {
  const food = useSyncExternalStore(onFoodChange, getFoodState);

  // Couriers land while the phone is closed too, so the clock runs here.
  useEffect(() => {
    let previous = performance.now();
    const id = window.setInterval(() => {
      tickDeliveries(Date.now());
      const now = performance.now();
      // A sleeping/background tab adds no backlog of hunger or thirst.
      const seconds = document.hidden
        ? 0
        : Math.min(1, (now - previous) / 1000);
      previous = now;
      tickNeeds(seconds);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (food.toast === null) return;
    const id = window.setTimeout(clearToast, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [food.toast, food.toastId]);

  const held = food.held;
  const heading = needLabel(food.needs, weedFelt());
  return (
    <div className="food-tray">
      <p className="food-toast" role="status" aria-live="polite">
        {food.toast ?? ""}
      </p>
      {heading && (
        <section className="food-needs" aria-label="Food and water needs">
          <strong>{heading}</strong>
          <label>
            Hunger{" "}
            <meter
              aria-label="Hunger"
              min={0}
              max={1}
              value={food.needs.hunger}
            />
          </label>
          <label>
            Thirst{" "}
            <meter
              aria-label="Thirst"
              min={0}
              max={1}
              value={food.needs.thirst}
            />
          </label>
          <p>Grab a snack and a soft drink, or order Plate Rush from Menu.</p>
        </section>
      )}
      {held && (
        <section className="food-held" aria-label="Held food">
          <p>
            Holding <strong>{held.name}</strong>
          </p>
          <button type="button" onClick={eatHeld}>
            {held.kind === "food" ? "Eat it" : "Sip it"}
          </button>
        </section>
      )}
    </div>
  );
}
