import { useEffect, useRef, useState, type JSX } from "react";
import type { Look } from "../../game/look.ts";
import {
  itemLabel,
  itemsIn,
  wearItem,
  type PurchaseResult,
  type ShopId,
  type ShopItem,
} from "../../game/shop.ts";
import { dayOf } from "../../game/challenges.ts";
import { closeShop, shopRequest } from "./shopRequest.ts";

/**
 * A shop's counter: what it sells, at what price, a button to buy each and
 * to put on what you own. Closes on Escape or the close button.
 */
export function ShopPanel({
  coins,
  wardrobe,
  look,
  setLook,
  onBuy,
}: {
  coins: number;
  wardrobe: readonly string[];
  look: Look;
  setLook: (look: Look) => void;
  onBuy: (id: string, store: ShopId, day: number) => PurchaseResult;
}): JSX.Element | null {
  const { open, name } = shopRequest.use();
  const [note, setNote] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setNote("");
    panel.current?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  if (!open) return null;
  const day = dayOf(Date.now());

  const wear = (item: ShopItem) => {
    setLook(wearItem(look, item));
    setNote(`Wearing ${itemLabel(item)}.`);
  };
  const buy = (item: ShopItem) => {
    const r = onBuy(item.id, open, day);
    if (r.ok) {
      setLook(wearItem(look, item));
      setNote(`${itemLabel(item)} is yours, and you're wearing it.`);
    } else
      setNote(
        r.reason === "broke"
          ? `${itemLabel(item)} is ${item.price} coins: you have ${coins}.`
          : "You already own that.",
      );
  };
  return (
    <div className="shop-backdrop" onClick={closeShop}>
      <div
        ref={panel}
        className="shop-panel"
        role="dialog"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shop-head">
          <h2>{name}</h2>
          <span className="shop-coins">{coins} coins</span>
          <button type="button" onClick={closeShop}>
            Close
          </button>
        </div>
        <ul className="shop-items">
          {itemsIn(open, day).map((item) => {
            const owned = wardrobe.includes(item.id);
            return (
              <li key={item.id}>
                <span className="shop-name">{itemLabel(item)}</span>
                <span className="shop-price">
                  {owned ? "Owned" : `${item.price} coins`}
                </span>
                {owned ? (
                  <button type="button" onClick={() => wear(item)}>
                    Wear
                  </button>
                ) : (
                  <button type="button" onClick={() => buy(item)}>
                    Buy
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="shop-note" role="status">
          {note}
        </p>
      </div>
    </div>
  );
}
