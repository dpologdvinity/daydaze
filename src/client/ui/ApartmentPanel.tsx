import { useState } from "react";
import {
  FURNITURE_CATALOG,
  FURNITURE_IDS,
  HOME_GRID,
  moveFurniture,
  pieceAt,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  type Furniture,
  type FurnitureId,
} from "../../game/home/decor.ts";
import { toggleLock, type HomeSave } from "../../game/home/home.ts";

type Change = (items: Furniture[] | null) => void;

// Decorating panel for the apartment. Pick a piece, then tap a grid cell to
// place it; tap a placed piece to select it, then rotate, move or remove it.
export function ApartmentPanel({
  home,
  onChange,
  onShelf,
}: {
  home: HomeSave;
  onChange: (home: HomeSave) => void;
  onShelf: () => void;
}) {
  const [choice, setChoice] = useState<FurnitureId | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [note, setNote] = useState("");

  const apply = (next: Furniture[] | null, done: string) => {
    if (next === null) {
      setNote("No room there.");
      return;
    }
    onChange({ ...home, furniture: next });
    setNote(done);
  };

  const onCell = (column: number, row: number) => {
    if (moving && picked !== null) {
      apply(moveFurniture(home.furniture, picked, [column, row]), "Moved.");
      setMoving(false);
      return;
    }
    if (choice !== null) {
      apply(
        placeFurniture(home.furniture, choice, [column, row], 0),
        `Placed ${FURNITURE_CATALOG[choice].name}.`,
      );
      setChoice(null);
      return;
    }
    const index = pieceAt(home.furniture, column, row);
    setPicked(index >= 0 ? index : null);
    setNote(index >= 0 ? "Selected. Rotate, move or remove it." : "");
  };

  const selected = picked !== null ? home.furniture[picked] : undefined;
  const change: Change = (items) => apply(items, "Done.");

  return (
    <section className="home-panel" aria-label="Decorate your apartment">
      <button
        type="button"
        aria-pressed={home.locked}
        onClick={() => onChange(toggleLock(home))}
      >
        Door: {home.locked ? "locked" : "unlocked"}
      </button>
      <button type="button" onClick={onShelf}>
        Practice at the shelf
      </button>
      <fieldset>
        <legend>Furniture</legend>
        {FURNITURE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={choice === id}
            onClick={() => {
              setChoice(choice === id ? null : id);
              setPicked(null);
              setMoving(false);
              setNote(`Tap a cell to place the ${FURNITURE_CATALOG[id].name}.`);
            }}
          >
            {FURNITURE_CATALOG[id].name}
          </button>
        ))}
      </fieldset>
      <div
        className="home-grid"
        style={{ gridTemplateColumns: `repeat(${HOME_GRID.columns}, 1fr)` }}
      >
        {Array.from({ length: HOME_GRID.rows * HOME_GRID.columns }, (_, i) => {
          const column = i % HOME_GRID.columns;
          const row = Math.floor(i / HOME_GRID.columns);
          const index = pieceAt(home.furniture, column, row);
          const label =
            index >= 0
              ? `${FURNITURE_CATALOG[home.furniture[index].id].name} at ${column + 1}, ${row + 1}`
              : `Empty cell ${column + 1}, ${row + 1}`;
          return (
            <button
              key={label}
              type="button"
              className="home-cell"
              aria-label={label}
              aria-pressed={index >= 0 && index === picked}
              onClick={() => onCell(column, row)}
            >
              {index >= 0 ? "■" : ""}
            </button>
          );
        })}
      </div>
      <fieldset disabled={selected === undefined}>
        <legend>Selected piece</legend>
        <button
          type="button"
          onClick={() => {
            if (picked !== null)
              change(rotateFurniture(home.furniture, picked));
          }}
        >
          Rotate
        </button>
        <button
          type="button"
          aria-pressed={moving}
          onClick={() => setMoving(!moving)}
        >
          Move
        </button>
        <button
          type="button"
          onClick={() => {
            if (picked === null) return;
            change(removeFurniture(home.furniture, picked));
            setPicked(null);
          }}
        >
          Remove
        </button>
      </fieldset>
      <p role="status" className="home-note">
        {note}
      </p>
    </section>
  );
}
