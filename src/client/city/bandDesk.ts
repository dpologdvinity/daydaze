// What the band shell tells the overlay: whether you are near the shell, what
// the band is doing (the hint under its name) and which tune is on. BandShell
// writes it; BandPanel reads it.

import { createStore } from "../rooms/shared/store.ts";

export const bandDesk = createStore({
  /** Within earshot of the shell (BandShell sets it). */
  near: false,
  /** "Now playing: ..." or "Next set at 2:30 PM". */
  hint: "",
  /** Whether a tune is playing. */
  playing: false,
});
