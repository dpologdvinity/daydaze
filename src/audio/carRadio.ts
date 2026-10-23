// The car radio: a button steps through a few stations of the procedural
// jukebox, then off again.
import type { TrackId } from "./proceduralJukebox.ts";

export const STATIONS: readonly { track: TrackId; label: string }[] = [
  { track: "sugar-rush-pop", label: "Sugar FM (pop)" },
  { track: "savanna-nightclub", label: "Club 104 (dance)" },
  { track: "canopy-lofi", label: "Night Drive (lofi)" },
  { track: "la-noche-salsa", label: "La Noche (salsa)" },
  { track: "player-two-chiptune", label: "8-Bit Radio (chiptune)" },
];

export function nextStation(current: TrackId | null): TrackId | null {
  const i = STATIONS.findIndex((s) => s.track === current);
  if (current === null) return STATIONS[0]?.track ?? null;
  return STATIONS[i + 1]?.track ?? null;
}
