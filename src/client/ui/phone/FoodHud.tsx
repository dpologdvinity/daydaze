import { useEffect, useSyncExternalStore } from "react";
import {
  clearToast,
  eatHeld,
  getFoodState,
  onFoodChange,
  tickDeliveries,
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
    const id = window.setInterval(() => tickDeliveries(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (food.toast === null) return;
    const id = window.setTimeout(clearToast, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [food.toast]);

  const held = food.held;
  return (
    <>
      <p className="food-toast" role="status" aria-live="polite">
        {food.toast ?? ""}
      </p>
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
    </>
  );
}
