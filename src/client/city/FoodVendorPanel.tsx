// Accessible street-food menus use the existing saved wallet purchase callback.
import { useEffect, useRef, useState } from "react";
import {
  FOOD_MENUS,
  FOOD_NAMES,
  buyStreetFood,
} from "../../game/city/vendors.ts";
import { foodCounterOpen, foodVendors } from "./foodVendors.ts";
import { relieve } from "../effects/drunk.ts";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../game/dialogue/pick.ts";
export function FoodVendorPanel({
  coins,
  onSpend,
}: {
  coins: number;
  onSpend: (price: number) => boolean;
}) {
  const { near } = foodVendors.use();
  const [receipt, setReceipt] = useState("");
  const [line, setLine] = useState("");
  const recent = useRef<RecentLines>([]);
  const pending = useRef(false);
  useEffect(() => {
    pending.current = false;
  }, [coins]);
  useEffect(() => {
    setReceipt("");
    setLine("");
    let cancelled = false;
    if (near)
      void loadDialogue().then(
        () => {
          if (cancelled) return;
          const result = pickLine({
            role: "street-food-vendor",
            situation: "greeting-first",
            rng: Math.random,
            recent: recent.current,
            tier: "teen",
          });
          recent.current = result.recent;
          setLine(result.text);
        },
        () => {},
      );
    return () => {
      cancelled = true;
    };
  }, [near]);
  if (!near) return null;
  return (
    <section
      className="game-panel food-vendor-panel"
      aria-label={FOOD_NAMES[near]}
      data-food-counter={near}
    >
      <p className="game-score">
        {FOOD_NAMES[near]} · {coins} coins
      </p>
      {line && <p>{line}</p>}
      <p role="status" data-food-receipt={receipt}>
        {receipt || "Choose a snack"}
      </p>
      <div className="game-row">
        {FOOD_MENUS[near].map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={coins < item.price}
            onClick={() => {
              if (pending.current || !foodCounterOpen(near)) return;
              if (buyStreetFood(coins, near, item.id) === null) return;
              pending.current = true;
              if (onSpend(item.price)) {
                relieve("food");
                setReceipt(`${item.name} purchased`);
              } else {
                pending.current = false;
                setReceipt("Not enough coins");
              }
            }}
          >
            {item.name} · {item.price} coins
          </button>
        ))}
      </div>
    </section>
  );
}
