import { useSyncExternalStore } from "react";
import type { Neighborhood } from "../../game/city/layout.ts";

// The city neighborhood the player is walking through, for the HUD title.
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

// Whether the player is inside Uptown's park (the ambience adds birds and the
// fountain); written by the city scene, like the neighborhood.
const parkListeners = new Set<() => void>();
let inParkNow = false;

export function setInPark(next: boolean): void {
  if (next === inParkNow) return;
  inParkNow = next;
  parkListeners.forEach((l) => l());
}

export function useInPark(): boolean {
  return useSyncExternalStore(
    (listener) => {
      parkListeners.add(listener);
      return () => parkListeners.delete(listener);
    },
    () => inParkNow,
  );
}
