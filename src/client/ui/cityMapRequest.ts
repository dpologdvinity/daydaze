import { useSyncExternalStore } from "react";

/** Something in the world (the bus stop's map board) asked for the city
 * map; the overlay opens it and clears the request. */
let requested = false;
const listeners = new Set<() => void>();

export function requestCityMap() {
  requested = true;
  for (const l of listeners) l();
}

export function clearCityMapRequest() {
  requested = false;
  for (const l of listeners) l();
}

export function useCityMapRequest(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => requested,
    () => requested,
  );
}
