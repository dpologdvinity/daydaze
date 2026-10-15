import { useState } from "react";
import {
  START,
  STORES,
  SUSPICION_MAX,
  stepStealth,
  watchersFacing,
  type Action,
  type Stealth,
  type Store,
} from "../../game/crime/shoplift.ts";
import { isBanned, type CrimeSave } from "../../game/crime/record.ts";

// Stub shop shelf for the shoplifting test. Two real stores stand in for the
// shops that arrive with the Shops milestone; the item prices are placeholders.
const STUB_SHELF: readonly { store: Store; item: string; price: number }[] = [
  {
    store: STORES.find((s) => s.id === "bodega") as Store,
    item: "Gum pack",
    price: 5,
  },
  {
    store: STORES.find((s) => s.id === "jewelry") as Store,
    item: "Silver hoop",
    price: 300,
  },
];

const ACTIONS: readonly { action: Action; label: string }[] = [
  { action: "browse", label: "Browse a beat" },
  { action: "pocket", label: "Pocket it" },
  { action: "run", label: "Run" },
  { action: "walk-out", label: "Walk out" },
];

export type Caught = { store: Store; price: number };

// Stealth challenge: each beat, watch the cones. Pocket when no watcher faces
// the floor, then walk out before the meter fills.
export function ShopliftPanel({
  crime,
  now,
  onCaught,
  onClose,
}: {
  crime: CrimeSave;
  now: number;
  onCaught: (caught: Caught) => void;
  onClose: () => void;
}) {
  const [shelf, setShelf] = useState<(typeof STUB_SHELF)[number] | null>(null);
  const [state, setState] = useState<Stealth>(START);

  if (shelf === null) {
    return (
      <section className="home-panel" aria-label="Test shop shelf">
        <p>Test shelf (stub). Pick a store to try a pocket.</p>
        {STUB_SHELF.map((entry) => {
          const banned = isBanned(crime, entry.store.id, now);
          return (
            <button
              key={entry.store.id}
              type="button"
              disabled={banned}
              onClick={() => setShelf(entry)}
            >
              {entry.store.name} ({entry.store.difficulty}, {entry.item}){" "}
              {banned ? "- banned today" : ""}
            </button>
          );
        })}
        <button type="button" onClick={onClose}>
          Leave the shelf
        </button>
      </section>
    );
  }

  const { store } = shelf;
  const facing = watchersFacing(store, state.beat);
  const finished = state.outcome !== "playing";

  const act = (action: Action) => {
    const next = stepStealth(store, state, action);
    setState(next);
    if (next.outcome === "stopped") onCaught({ store, price: shelf.price });
  };

  return (
    <section className="home-panel" aria-label={`Shoplifting at ${store.name}`}>
      <p>
        {store.name}: {shelf.item} (${shelf.price}). Watchers facing the floor:{" "}
        {facing} of {store.watchers.length}.
      </p>
      <div
        role="meter"
        aria-label="Suspicion"
        aria-valuemin={0}
        aria-valuemax={SUSPICION_MAX}
        aria-valuenow={Math.round(state.suspicion)}
        className="suspicion"
      >
        <span style={{ width: `${Math.min(100, state.suspicion)}%` }} />
      </div>
      {ACTIONS.map(({ action, label }) => (
        <button
          key={action}
          type="button"
          disabled={finished}
          onClick={() => act(action)}
        >
          {label}
        </button>
      ))}
      {state.outcome === "escaped" && (
        <p role="status">You got out with it. Nobody noticed.</p>
      )}
      {state.outcome === "left" && <p role="status">Nothing pocketed.</p>}
      {finished && (
        <button type="button" onClick={onClose}>
          Close
        </button>
      )}
    </section>
  );
}
