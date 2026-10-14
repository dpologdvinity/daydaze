import { createContext, useContext, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
  );
}

// Provided by App so scene components (inside the Canvas) can read it too.
export const ReducedMotionContext = createContext(false);

export const useReducedMotion = () => useContext(ReducedMotionContext);
