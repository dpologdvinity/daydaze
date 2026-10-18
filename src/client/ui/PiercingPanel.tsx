import { useState, type JSX } from "react";
import {
  PIERCING_SPOTS,
  PIERCING_STYLES,
  piercingsOf,
  type Look,
  type PiercingSpot,
} from "../../game/look.ts";
import { itemsIn, pierce, type PurchaseResult } from "../../game/shop.ts";

const SAY: Record<Exclude<PurchaseResult, { ok: true }>["reason"], string> = {
  unknown: "That piece isn't in the case.",
  owned: "You already own that piece.",
  broke: "Not enough coins for that piece.",
};

/**
 * Ink & Needle's counter: pick a spot, then a piece of fine jewelry. Pieces
 * you don't own are bought and put in; ones you own go in for free, and
 * can be worn from the dressing room too.
 */
export function PiercingPanel({
  look,
  setLook,
  wardrobe,
  onBuy,
}: {
  look: Look;
  setLook: (look: Look) => void;
  wardrobe: readonly string[];
  onBuy: (id: string) => PurchaseResult;
}): JSX.Element {
  const [spot, setSpot] = useState<PiercingSpot>("nose");
  const [note, setNote] = useState("");
  const worn = piercingsOf(look)[spot];
  const label = (id: string) =>
    PIERCING_STYLES.find((s) => s.id === id)?.label ?? id;
  return (
    <section className="game-panel parlor-panel" aria-label="Piercing counter">
      <p className="game-call">Pick a spot, then a piece.</p>
      <div className="parlor-spots" role="radiogroup" aria-label="Spot">
        {PIERCING_SPOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === spot}
            onClick={() => setSpot(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ul className="parlor-pieces">
        {itemsIn("piercing").map((item) => {
          const owned = wardrobe.includes(item.id);
          const on = worn === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (!owned) {
                    const r = onBuy(item.id);
                    if (!r.ok) return setNote(SAY[r.reason]);
                  }
                  setLook(pierce(look, spot, item.id));
                  setNote(
                    `${label(item.id)} in your ${spot === "brow" ? "eyebrow" : spot === "navel" ? "belly button" : spot}!`,
                  );
                }}
              >
                <span>{label(item.id)}</span>
                <span>
                  {owned ? (on ? "Wearing" : "Owned") : `${item.price} coins`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {worn !== "none" && (
        <button
          type="button"
          className="game-leave"
          onClick={() => {
            setLook(pierce(look, spot, "none"));
            setNote("Taken out.");
          }}
        >
          Take it out
        </button>
      )}
      <p className="game-call" role="status">
        {note}
      </p>
    </section>
  );
}
