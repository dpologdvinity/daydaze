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
import { liftStore, recognized, startLift } from "../../game/crime/lift.ts";
import { isBanned, type CrimeSave } from "../../game/crime/record.ts";
import {
  stepStealth,
  SUSPICION_MAX,
  watchersFacing,
  type Action,
  type Stealth,
} from "../../game/crime/shoplift.ts";
import type { Caught } from "./ShopliftPanel.tsx";
import { closeShop, shopRequest } from "./shopRequest.ts";

const MOVES: readonly { action: Action; label: string }[] = [
  { action: "browse", label: "Browse a moment" },
  { action: "pocket", label: "Pocket it" },
  { action: "walk-out", label: "Walk out" },
  { action: "run", label: "Run for it" },
];

/**
 * A shop's counter: what it sells, at what price, a button to buy each and
 * to put on what you own. Where there's stock on the shelves, a Pocket button
 * starts a lift: the clerk, guards and cameras turn by turns (shoplift.ts);
 * pocket while nobody faces you, then walk out. Get away and it's yours,
 * tagged stolen; get caught and the arrest plays out. Closes on Escape.
 */
export function ShopPanel({
  coins,
  wardrobe,
  look,
  setLook,
  onBuy,
  crime,
  onSteal,
  onCaught,
}: {
  coins: number;
  wardrobe: readonly string[];
  look: Look;
  setLook: (look: Look) => void;
  onBuy: (id: string, store: ShopId, day: number) => PurchaseResult;
  crime: CrimeSave;
  onSteal: (id: string, storeId: string) => void;
  onCaught: (caught: Caught) => void;
}): JSX.Element | null {
  const { open, name } = shopRequest.use();
  const [note, setNote] = useState("");
  const [lift, setLift] = useState<{ item: ShopItem; state: Stealth } | null>(
    null,
  );
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setNote("");
    setLift(null);
    panel.current?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  if (!open) return null;
  const now = Date.now();
  const day = dayOf(now);
  const store = liftStore(open);
  const banned = store !== null && isBanned(crime, store.id, now);
  const known = recognized(crime, look, open, day);

  const step = (action: Action) => {
    if (!lift || !store) return;
    const state = stepStealth(store, lift.state, action);
    setLift({ ...lift, state });
    if (state.outcome === "escaped") {
      onSteal(lift.item.id, store.id);
      setLook(wearItem(look, lift.item));
      setNote(
        `You walked out with ${itemLabel(lift.item)}. Nobody stopped you.`,
      );
    } else if (state.outcome === "stopped") {
      closeShop();
      onCaught({ store, price: lift.item.price });
    } else if (state.outcome === "left") setNote("You put it back.");
  };

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
        {banned && (
          <p className="shop-note" role="status">
            You're banned from here until tomorrow.
          </p>
        )}
        {known && !lift && (
          <p className="shop-note">
            The clerk eyes your {itemLabel(known)}: &ldquo;That looks like one
            of ours.&rdquo;
          </p>
        )}
        {lift && store && (
          <section aria-label={`Lifting ${itemLabel(lift.item)}`}>
            <p>
              {itemLabel(lift.item)}. Watching you now:{" "}
              {watchersFacing(store, lift.state.beat)} of{" "}
              {store.watchers.length}.
            </p>
            <p className="shop-note">
              Pocket it while nobody&rsquo;s watching, then walk out calmly.
            </p>
            <div
              role="meter"
              aria-label="Suspicion"
              aria-valuemin={0}
              aria-valuemax={SUSPICION_MAX}
              aria-valuenow={Math.round(lift.state.suspicion)}
              className="suspicion"
            >
              <span
                style={{ width: `${Math.min(100, lift.state.suspicion)}%` }}
              />
            </div>
            <div className="shop-lift">
              {lift.state.outcome === "playing" ? (
                MOVES.filter(
                  (m) => m.action !== "pocket" || !lift.state.pocketed,
                ).map((m) => (
                  <button
                    key={m.action}
                    type="button"
                    onClick={() => step(m.action)}
                  >
                    {m.label}
                  </button>
                ))
              ) : (
                <button type="button" onClick={() => setLift(null)}>
                  Back to the shelves
                </button>
              )}
            </div>
          </section>
        )}
        {!lift && (
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
                    <>
                      <button
                        type="button"
                        disabled={banned}
                        onClick={() => buy(item)}
                      >
                        Buy
                      </button>
                      {store && (
                        <button
                          type="button"
                          className="shop-pocket"
                          disabled={banned}
                          aria-label={`Pocket ${itemLabel(item)}`}
                          onClick={() => {
                            setNote("");
                            setLift({ item, state: startLift(known !== null) });
                          }}
                        >
                          Pocket
                        </button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="shop-note" role="status">
          {note}
        </p>
      </div>
    </div>
  );
}
