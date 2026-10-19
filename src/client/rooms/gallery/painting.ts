import { cleanPainting, PAINTING_KEY } from "../../../game/painting.ts";
import { createStore } from "../shared/store.ts";

function load(): string | null {
  try {
    return cleanPainting(localStorage.getItem(PAINTING_KEY));
  } catch {
    return null;
  }
}

/** The player's painting on the open wall (a PNG data URL), and whether the
 * easel is open. */
export const painting = createStore({ url: load(), easel: false });

/** Keeps the painting; false when storage refuses it (full, or private). */
export function hang(url: string): boolean {
  const clean = cleanPainting(url);
  if (!clean) return false;
  try {
    localStorage.setItem(PAINTING_KEY, clean);
  } catch {
    return false;
  }
  painting.set({ url: clean });
  return true;
}
