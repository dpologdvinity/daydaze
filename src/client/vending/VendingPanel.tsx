// The soda menu at a vending machine: three made-up drinks for a few coins,
// paid from the saved wallet through the same onSpend the other counters use.
// A bought drink takes the edge off a buzz and drops with a clunk.

import { useEffect, useRef, useState, type JSX } from "react";
import { playCanDrop } from "../../audio/worldSounds.ts";
import { DRINKS, buyDrink } from "../../game/vending.ts";
import { relieve } from "../effects/drunk.ts";
import { vendingNear } from "./vendingNear.ts";

export function VendingPanel({
  coins,
  onSpend,
}: {
  coins: number;
  onSpend: (price: number) => boolean;
}): JSX.Element | null {
  const { near } = vendingNear.use();
  const [receipt, setReceipt] = useState("");
  const pending = useRef(false);
  // the wallet has moved on: the next purchase may go
  useEffect(() => {
    pending.current = false;
  }, [coins]);
  useEffect(() => {
    if (!near) setReceipt("");
  }, [near]);
  if (!near) return null;
  return (
    <section
      className="game-panel food-vendor-panel"
      aria-label="Vending machine"
      data-vending="open"
    >
      <p className="game-score">Vending machine · {coins} coins</p>
      <p role="status" data-vending-receipt={receipt}>
        {receipt || "Pick a soda"}
      </p>
      <div className="game-row">
        {DRINKS.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={coins < d.price}
            onClick={() => {
              if (pending.current || buyDrink(coins, d.id) === null) return;
              pending.current = true;
              if (onSpend(d.price)) {
                relieve("drink");
                playCanDrop();
                setReceipt(`${d.name} dropped`);
              } else {
                pending.current = false;
                setReceipt("Not enough coins");
              }
            }}
          >
            {d.name} · {d.price} coins
          </button>
        ))}
      </div>
    </section>
  );
}
