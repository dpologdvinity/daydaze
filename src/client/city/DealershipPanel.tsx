import type { JSX } from "react";
import { DISPLAY } from "../../game/dealership.ts";
import { carById } from "../../game/driving/roster.ts";
import { priceOf } from "../../game/garage.ts";

/** The showroom's price list: buy a car, and it's yours to drive. */
export function DealershipPanel({
  coins,
  garage,
  onBuy,
}: {
  coins: number;
  garage: readonly string[];
  onBuy: (id: string) => void;
}): JSX.Element {
  return (
    <section className="game-panel" aria-label="Cars for sale">
      <p className="game-call">
        Daydaze Motors. Buy one and it waits at the curb.
      </p>
      <ul className="price-list">
        {DISPLAY.map(({ id }) => {
          const car = carById(id);
          if (!car) return null;
          const price = priceOf(car);
          const owned = garage.includes(id);
          return (
            <li key={id}>
              <span>
                {car.name} <small>({car.class})</small>
              </span>
              <button
                type="button"
                disabled={owned || coins < price}
                onClick={() => onBuy(id)}
                aria-label={
                  owned
                    ? `${car.name}: owned`
                    : `Buy the ${car.name} for ${price} coins`
                }
              >
                {owned ? "Owned" : `${price} coins`}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
