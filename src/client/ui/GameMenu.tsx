// The game menu: one button in the dock that opens a sheet holding every
// control you reach for now and then (sound, photo, map, phone, collections,
// friends, invite, skates, your car's options, mood and camera). The screen
// itself keeps only the place, your coins, chat, the dressing room and what
// the moment needs (a drink at the bar, a seat, a game). The sheet closes on
// Escape, on the Close button, and after an item that opens something else.

import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { createStore } from "../rooms/shared/store.ts";

export const gameMenu = createStore({ open: false });

/** Closes the menu: for items that open a panel of their own. */
export const closeMenu = () => gameMenu.set({ open: false });

export function GameMenu({ children }: { children: ReactNode }): JSX.Element {
  const { open } = gameMenu.use();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      toggle.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="menu-open"
        aria-expanded={open}
        aria-controls="game-menu"
        onClick={() => gameMenu.set({ open: !open })}
      >
        Menu
      </button>
      {open && (
        <section
          id="game-menu"
          className="game-menu"
          role="dialog"
          aria-label="Menu"
        >
          <div className="game-menu-head">
            <h2>Menu</h2>
            <button type="button" aria-label="Close menu" onClick={closeMenu}>
              Close
            </button>
          </div>
          {children}
        </section>
      )}
    </>
  );
}
