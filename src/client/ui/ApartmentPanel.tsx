// The apartment's decorating panel: lock the door, practice at the shelf, and
// place, select, rotate, move or remove furniture on the home grid. Every
// change goes through the pure helpers in src/game/home/decor.ts, which return
// null when a piece does not fit.

import { useState } from "react";
import {
  FURNITURE_CATALOG,
  FURNITURE_GROUPS,
  FURNITURE_IDS,
  WINDOW_COLUMNS,
  defaultVariant,
  HOME_GRID,
  moveFurniture,
  pieceAt,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  setVariant,
  wallPieceAt,
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
  const [variant, setVariant_] = useState(0);
  const [note, setNote] = useState("");

  const apply = (next: Furniture[] | null, done: string) => {
    if (next === null) {
      setNote("No room there.");
      return;
    }
    onChange({ ...home, furniture: next });
    setNote(done);
  };

  const selectedPiece = picked !== null ? home.furniture[picked] : undefined;
  const wallSelected =
    selectedPiece !== undefined && FURNITURE_CATALOG[selectedPiece.id].wall;

  // the back-wall strip: wall pieces are placed, selected and moved here
  const onWall = (column: number) => {
    if (moving && picked !== null && wallSelected) {
      apply(moveFurniture(home.furniture, picked, [column, 0]), "Moved.");
      setMoving(false);
      return;
    }
    if (choice !== null) {
      if (!FURNITURE_CATALOG[choice].wall) {
        setNote("That one stands on the floor.");
        return;
      }
      apply(
        placeFurniture(home.furniture, choice, [column, 0], 0, variant),
        `Hung ${FURNITURE_CATALOG[choice].name}.`,
      );
      setChoice(null);
      return;
    }
    const index = wallPieceAt(home.furniture, column);
    setPicked(index >= 0 ? index : null);
    setNote(index >= 0 ? "Selected. Move or remove it." : "");
  };

  const onCell = (column: number, row: number) => {
    if (moving && picked !== null && wallSelected) {
      setNote("Tap the back wall strip to move it.");
      return;
    }
    if (choice !== null && FURNITURE_CATALOG[choice].wall) {
      setNote("Tap the back wall strip to hang it.");
      return;
    }
    if (moving && picked !== null) {
      apply(moveFurniture(home.furniture, picked, [column, row]), "Moved.");
      setMoving(false);
      return;
    }
    if (choice !== null) {
      apply(
        placeFurniture(home.furniture, choice, [column, row], 0, variant),
        `Placed ${FURNITURE_CATALOG[choice].name}.`,
      );
      setChoice(null);
      return;
    }
    const index = pieceAt(home.furniture, column, row);
    setPicked(index >= 0 ? index : null);
    setNote(index >= 0 ? "Selected. Rotate, move or remove it." : "");
  };

  const selected = selectedPiece;
  // the looks on offer: the piece about to be placed, else the selected one
  const lookId = choice ?? selected?.id ?? null;
  const looks = lookId === null ? [] : FURNITURE_CATALOG[lookId].variants;
  const shownLook = choice !== null ? variant : (selected?.variant ?? 0);
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
        {FURNITURE_GROUPS.map((group) => (
          <details key={group} open>
            <summary>{group}</summary>
            {FURNITURE_IDS.filter(
              (id) => FURNITURE_CATALOG[id].group === group,
            ).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={choice === id}
                onClick={() => {
                  setChoice(choice === id ? null : id);
                  setVariant_(defaultVariant(id));
                  setPicked(null);
                  setMoving(false);
                  setNote(
                    `Tap a cell to place the ${FURNITURE_CATALOG[id].name}.`,
                  );
                }}
              >
                {FURNITURE_CATALOG[id].name}
              </button>
            ))}
          </details>
        ))}
      </fieldset>
      <div
        className="home-grid"
        aria-label="Back wall"
        style={{ gridTemplateColumns: `repeat(${HOME_GRID.columns}, 1fr)` }}
      >
        {Array.from({ length: HOME_GRID.columns }, (_, column) => {
          const index = wallPieceAt(home.furniture, column);
          const inWindow = WINDOW_COLUMNS.includes(column);
          const label = inWindow
            ? `Window ${column + 1}`
            : index >= 0
              ? `${FURNITURE_CATALOG[home.furniture[index].id].name} on the wall at ${column + 1}`
              : `Empty wall ${column + 1}`;
          return (
            <button
              key={label}
              type="button"
              className="home-cell home-wall"
              aria-label={label}
              aria-pressed={index >= 0 && index === picked}
              disabled={inWindow}
              onClick={() => onWall(column)}
            >
              {index >= 0 ? "▬" : ""}
            </button>
          );
        })}
      </div>
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
      {looks.length > 1 && (
        <fieldset>
          <legend>Look</legend>
          {looks.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={shownLook === i}
              onClick={() => {
                if (choice !== null || picked === null) {
                  setVariant_(i);
                  return;
                }
                apply(setVariant(home.furniture, picked, i), `${name}.`);
              }}
            >
              {name}
            </button>
          ))}
        </fieldset>
      )}
      <fieldset disabled={selected === undefined}>
        <legend>Selected piece</legend>
        <button
          type="button"
          disabled={wallSelected}
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
