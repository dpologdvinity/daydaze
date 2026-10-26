// Collections: the photo album (every place you've been, and your latest
// snapshots), closet sets you can complete for a reward, and a sticker book
// with your best grade in each game. Rules in src/game/collections.ts; the
// snapshots live on this device (albumSnaps.ts).

import { useEffect, useState, type JSX } from "react";
import { createStore } from "../rooms/shared/store.ts";
import {
  ALBUM_PLACES,
  CLOSET_SETS,
  setProgress,
  stickers,
} from "../../game/collections.ts";
import type { Bests } from "../../game/prizes.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import { loadSnaps, snaps } from "../albumSnaps.ts";

/** Whether the book is open: the game menu opens it (GameMenu.tsx). */
export const collectionsBook = createStore({ open: false });
const setOpen = (open: boolean) => collectionsBook.set({ open });

const TABS = ["Album", "Sets", "Stickers"] as const;
type Tab = (typeof TABS)[number];

export function Collections({
  visited,
  wardrobe,
  claimed,
  bests,
  onClaim,
}: {
  visited: readonly RoomId[];
  wardrobe: readonly string[];
  /** Sets whose reward is already claimed. */
  claimed: readonly string[];
  bests: Bests;
  onClaim: (setId: string) => void;
}): JSX.Element {
  const { open } = collectionsBook.use();
  const [tab, setTab] = useState<Tab>("Album");
  const { list } = snaps.use();
  useEffect(() => {
    if (open) loadSnaps();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const book = stickers(bests);
  return (
    <>
      {open && (
        <section
          className="home-panel collections-panel"
          role="dialog"
          aria-label="Collections"
        >
          <div className="collections-head">
            <h2>Collections</h2>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="collections-tabs" role="group" aria-label="Pages">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Album" && (
            <div className="collections-page">
              <h3>
                Places · {visited.length} of {ALBUM_PLACES.length}
              </h3>
              <ul className="album-places" aria-label="Places visited">
                {visited.map((id) => (
                  <li key={id}>{ROOMS[id].name}</li>
                ))}
              </ul>
              <p className="album-left">
                {ALBUM_PLACES.length - visited.length > 0
                  ? `${ALBUM_PLACES.length - visited.length} places still to find.`
                  : "You've been everywhere!"}
              </p>
              <h3>Snapshots</h3>
              {list.length ? (
                <ul className="album-snaps" aria-label="Snapshots">
                  {list.map((s) => (
                    <li key={s.at}>
                      <img src={s.src} alt={`A snapshot at ${s.place}`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Take a photo anywhere and it lands here.</p>
              )}
            </div>
          )}
          {tab === "Sets" && (
            <ul
              className="collections-page closet-sets"
              aria-label="Closet sets"
            >
              {CLOSET_SETS.map((set) => {
                const p = setProgress(set, wardrobe);
                const done = claimed.includes(set.id);
                return (
                  <li key={set.id}>
                    <strong>{set.label}</strong>{" "}
                    <small>
                      {p.owned} of {p.total} · {set.reward} coins
                    </small>
                    {done ? (
                      <span className="set-done">Claimed ★</span>
                    ) : (
                      <button
                        type="button"
                        disabled={!p.complete}
                        onClick={() => onClaim(set.id)}
                      >
                        {p.complete ? "Claim" : "Keep shopping"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {tab === "Stickers" && (
            <ul className="collections-page sticker-book" aria-label="Stickers">
              {book.map((s) => (
                <li key={s.game} data-grade={s.grade ?? "none"}>
                  <span className="sticker" aria-hidden="true">
                    {s.grade ?? "·"}
                  </span>
                  {s.label}
                  <span className="sr-only">
                    {s.grade ? `: grade ${s.grade}` : ": not played yet"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
