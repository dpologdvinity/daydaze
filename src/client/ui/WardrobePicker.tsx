// The closet's mix-and-match pickers: one row per wardrobe slot (top,
// bottom, one-piece, outerwear, legwear) with the garments the wardrobe may
// wear, and a color for the one worn. The layering rules are wardrobe.ts's.
// Above the rows, a search box, a style filter and favorites narrow a long
// closet; below them, whole outfits are saved and worn again (closet.ts).
import { useState } from "react";
import {
  MAX_NAME,
  MAX_OUTFITS,
  STYLES,
  deleteOutfit,
  filterGarments,
  saveOutfit,
  toggleFavorite,
  type ClosetSave,
  type Style,
} from "../../game/closet.ts";
import type { Look } from "../../game/look.ts";
import { OUTFIT_COLORS } from "../../game/look.ts";
import { wearableGarments } from "../../game/shop.ts";
import {
  encodeWear,
  garment,
  putOn,
  takeOff,
  wearOf,
  type Slot,
} from "../../game/wardrobe.ts";
import { Chips, ColorPicker, Tiles } from "./controls.tsx";

/** The slots in closet order, with their names. */
const ROWS: readonly { slot: Slot; label: string; optional: boolean }[] = [
  { slot: "top", label: "Top", optional: false },
  { slot: "bottom", label: "Bottom", optional: false },
  { slot: "dress", label: "One-piece", optional: false },
  { slot: "outer", label: "Outerwear", optional: true },
  { slot: "legwear", label: "Legwear", optional: true },
];

export function WardrobePicker({
  look,
  setLook,
  wardrobe,
  closet,
  setCloset,
}: {
  look: Look;
  setLook: (look: Look) => void;
  wardrobe: readonly string[];
  closet: ClosetSave;
  setCloset: (closet: ClosetSave) => void;
}) {
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<Style | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const wear = wearOf(look);
  const owned = wearableGarments(wardrobe);
  const shown = filterGarments(
    owned,
    {
      query,
      style: style === "all" ? undefined : style,
      favoritesOnly,
    },
    closet.favorites,
  );
  const code = encodeWear(wear);
  const wearIt = (next: typeof wear) =>
    setLook({ ...look, wear: encodeWear(next) });
  return (
    <>
      <section className="closet-find" aria-label="Find clothes">
        <input
          type="search"
          aria-label="Search clothes"
          placeholder="Search clothes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Chips
          label="Style"
          options={[
            { id: "all", label: "All styles" },
            ...STYLES.map((id) => ({
              id,
              label: id.charAt(0).toUpperCase() + id.slice(1),
            })),
          ]}
          value={style}
          onPick={setStyle}
        />
        <button
          type="button"
          className="chip"
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          Favorites only
        </button>
        {shown.length === 0 && (
          <p role="status" className="closet-empty">
            No clothes match. Clear the search or the filters.
          </p>
        )}
      </section>
      {ROWS.map(({ slot, label, optional }) => {
        const worn = wear[slot];
        const wornGarment = worn && garment(worn.id);
        const inRow = shown.filter((g) => g.slot === slot);
        // the worn garment stays listed, so the radio group always has a value
        const options = [
          ...(optional
            ? [{ id: "none", label: "None", thumbnail: false } as const]
            : []),
          ...(wornGarment && !inRow.includes(wornGarment) ? [wornGarment] : []),
          ...inRow,
        ];
        return (
          <section key={slot} data-slot={slot}>
            <div className="closet-head">
              <h3>{label}</h3>
              {wornGarment && (
                <button
                  type="button"
                  className="chip favorite"
                  aria-pressed={closet.favorites.includes(wornGarment.id)}
                  aria-label={`Favorite ${wornGarment.label}`}
                  onClick={() =>
                    setCloset(toggleFavorite(closet, wornGarment.id))
                  }
                >
                  {closet.favorites.includes(wornGarment.id) ? "★" : "☆"}
                </button>
              )}
            </div>
            <Tiles
              tiles="garment"
              eagerCount={0}
              label={label}
              options={options}
              value={worn?.id ?? (optional ? "none" : "")}
              onPick={(id) =>
                wearIt(
                  id === "none"
                    ? takeOff(wear, slot)
                    : putOn(wear, id, worn?.color ?? look.outfitColor),
                )
              }
            />
            {worn && (
              <ColorPicker
                label={`${label} color`}
                options={OUTFIT_COLORS}
                value={worn.color}
                onPick={(color) => wearIt(putOn(wear, worn.id, color))}
              />
            )}
          </section>
        );
      })}
      <section className="closet-outfits" aria-label="Saved outfits">
        <h3>Saved outfits</h3>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const next = saveOutfit(closet, name, code);
            if (next !== closet) {
              setCloset(next);
              setName("");
              setNote("");
            } else {
              // nothing was saved: an empty name, or a full closet
              setNote(
                name.trim() === ""
                  ? "Give the outfit a name first."
                  : `The closet holds ${MAX_OUTFITS} outfits. Delete one, or reuse a name to replace it.`,
              );
            }
          }}
        >
          <input
            type="text"
            aria-label="Outfit name"
            placeholder="Name this outfit"
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="chip">
            Save this outfit
          </button>
        </form>
        {note && (
          <p role="status" className="closet-empty">
            {note}
          </p>
        )}
        {closet.outfits.length === 0 ? (
          <p className="closet-empty">
            Nothing saved yet. Up to {MAX_OUTFITS} outfits are kept.
          </p>
        ) : (
          <ul className="closet-saved">
            {closet.outfits.map((o) => (
              <li key={o.name}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={o.wear === code}
                  aria-label={`Wear ${o.name}`}
                  onClick={() => setLook({ ...look, wear: o.wear })}
                >
                  {o.name}
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-label={`Delete ${o.name}`}
                  onClick={() => {
                    setCloset(deleteOutfit(closet, o.name));
                    setNote("");
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
