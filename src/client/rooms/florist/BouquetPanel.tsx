// Petal & Stem's bouquet builder: tap stems to add them to the counter,
// pick a wrap and ribbon, then buy. Every control is a labeled button, so the
// keyboard reaches all of it.
import type { JSX } from "react";
import "./florist.css";
import {
  bouquetPrice,
  harmonyLabel,
  MAX_STEMS,
  MIN_STEMS,
  RIBBONS,
  STEMS,
  WRAPS,
  validateBouquet,
  type Stem,
} from "../../../game/florist.ts";
import {
  buyDraft,
  clearCounter,
  counter,
  floristDesk,
  pickStem,
  setRibbon,
  setWrap,
  undoStem,
} from "./session.ts";

const STEM_IDS = Object.keys(STEMS) as Stem[];

export function BouquetPanel(): JSX.Element {
  const { draft, status } = counter.use();
  const { coins } = floristDesk.use();
  const price = bouquetPrice(draft);
  const complete = validateBouquet(draft);
  const missing = Math.max(0, MIN_STEMS - draft.stems.length);
  const affordable = price <= coins;
  const full = draft.stems.length >= MAX_STEMS;
  return (
    <section className="game-panel" aria-label="Bouquet builder">
      <p className="game-call" role="status">
        {status === "bought"
          ? "Wrapped and paid. They're in the vase at your apartment."
          : status === "broke"
            ? "Not enough coins for that bouquet."
            : draft.stems.length === 0
              ? `Pick ${MIN_STEMS} to ${MAX_STEMS} stems from the buckets.`
              : `${draft.stems.length} stems · ${price} coins · ${harmonyLabel(draft)}`}
      </p>
      <div className="florist-stems" role="group" aria-label="Stems">
        {STEM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={full}
            onClick={() => pickStem(id)}
          >
            {STEMS[id].name} · {STEMS[id].price} coins
          </button>
        ))}
      </div>
      <div className="game-row" role="group" aria-label="Wrap">
        {WRAPS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={draft.wrap === w}
            onClick={() => setWrap(w)}
          >
            {w} wrap
          </button>
        ))}
      </div>
      <div className="game-row" role="group" aria-label="Ribbon">
        {RIBBONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={draft.ribbon === r}
            onClick={() => setRibbon(r)}
          >
            {r} ribbon
          </button>
        ))}
      </div>
      <div className="game-row">
        <button
          type="button"
          disabled={draft.stems.length === 0}
          onClick={undoStem}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={draft.stems.length === 0}
          onClick={clearCounter}
        >
          Start over
        </button>
      </div>
      <button
        type="button"
        className="game-main"
        disabled={!complete || !affordable}
        onClick={buyDraft}
      >
        {complete ? `Buy bouquet · ${price} coins` : `Add ${missing} more`}
      </button>
    </section>
  );
}
