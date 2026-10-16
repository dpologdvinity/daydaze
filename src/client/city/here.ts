import { useSyncExternalStore } from "react";
import type { Neighborhood } from "../../game/city/layout.ts";

// The city neighbourhood the player is walking through, for the HUD title.
// The city scene writes it each frame; it only notifies on a change.
const listeners = new Set<() => void>();
let current: Neighborhood = "downtown";

export const NEIGHBORHOOD_NAMES: Record<Neighborhood, string> = {
  downtown: "Downtown",
  "nightlife-row": "Nightlife Row",
  beachside: "Beachside",
  "little-manila": "Little Manila",
  "arts-district": "Arts District",
  "chinatown-koreatown": "Chinatown & Koreatown",
  uptown: "Uptown",
  suburbia: "Suburbia",
  fairground: "The Fairground",
};

export function setNeighborhood(next: Neighborhood): void {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNeighborhood(): Neighborhood {
  return useSyncExternalStore(subscribe, () => current);
}
