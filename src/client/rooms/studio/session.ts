import { playInstrumentNote } from "../../../audio/instrumentSynths.ts";
import type { Station } from "../../../game/studio.ts";
import { createStore } from "../shared/store.ts";

/** The instrument picked on the panel (the scene picks the one you walk up
 * to), and the last note played, so the scene can light it. */
export const studio = createStore({
  station: "piano" as Station,
  last: null as { station: Station; note: number; at: number } | null,
});

export function pick(station: Station) {
  if (studio.get().station !== station) studio.set({ station });
}

/** Plays note 0..7 on the picked instrument. */
export function play(note: number) {
  const { station } = studio.get();
  playInstrumentNote(station, note);
  studio.set({ last: { station, note, at: performance.now() } });
}
