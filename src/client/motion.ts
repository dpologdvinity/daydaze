// The player's prefers-reduced-motion setting: a hook that follows the media
// query, and a context so components inside the Canvas can read it.

import { createContext, useContext, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** True while the OS asks for reduced motion; re-renders when that changes. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
  );
}

// Provided by App so scene components (inside the Canvas) can read it too.
export const ReducedMotionContext = createContext(false);

/** Reads the reduced-motion value App provides; false outside the provider. */
export const useReducedMotion = () => useContext(ReducedMotionContext);
