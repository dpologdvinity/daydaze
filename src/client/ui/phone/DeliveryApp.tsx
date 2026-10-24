// Plate Rush, the phone's food delivery app: browse venues, order a dish, and
// watch couriers on the way. Orders and their timers live in the food store
// (src/client/food/store.ts); this dialog only reads and repaints them once a
// second.

import { useEffect, useState, useSyncExternalStore } from "react";
import { Dialog } from "../../../minigames/Dialog.tsx";
import {
  DELIVERY_SECONDS,
  deliveryProgress,
} from "../../../game/food/delivery.ts";
import {
  FOOD_VENUES,
  menuItemById,
  type FoodVenue,
} from "../../../game/food/venues.ts";
import { getFoodState, onFoodChange, orderItem } from "../../food/store.ts";
import "./phone.css";

const CLOCK_MS = 1000;

/**
 * Plate Rush, the in-game delivery app. Browse the venues, pick a dish, and a
 * courier brings it to wherever the doll is after a short timer. Native dialog,
 * so Tab stays inside it and Escape closes it.
 */
export function DeliveryApp({ onClose }: { onClose: () => void }) {
  const [venue, setVenue] = useState<FoodVenue | null>(null);
  const food = useSyncExternalStore(onFoodChange, getFoodState);
  // Courier progress repaints once a second while the app is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Dialog
      title="Plate Rush"
      subtitle={venue ? venue.name : "Delivery from the city's kitchens"}
      onClose={onClose}
      className="phone-app"
    >
      {venue ? (
        <section className="phone-menu" aria-label={`Menu for ${venue.name}`}>
          <button
            type="button"
            className="phone-back"
            onClick={() => setVenue(null)}
          >
            Back to venues
          </button>
          <p className="phone-cuisine">{venue.cuisine}</p>
          <ul>
            {venue.menu.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <span className="phone-price">{item.price} coins</span>
                <button
                  type="button"
                  onClick={() => orderItem(item.id, Date.now())}
                  aria-label={`Order ${item.name} from ${venue.name}`}
                >
                  Order
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="phone-venues" aria-label="Venues">
          <ul>
            {FOOD_VENUES.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setVenue(v)}>
                  <span>{v.name}</span>
                  <span className="phone-cuisine">{v.cuisine}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="phone-orders" aria-label="Orders on the way">
        <h3>On the way</h3>
        {food.orders.length === 0 ? (
          <p>
            Nothing on the way. A courier arrives about {DELIVERY_SECONDS}{" "}
            seconds after you order.
          </p>
        ) : (
          <ul>
            {food.orders.map((order) => (
              <li key={order.id}>
                <span>{menuItemById(order.itemId)?.item.name}</span>
                <progress value={deliveryProgress(order, now)} max={1} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
