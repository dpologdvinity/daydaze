import { useSyncExternalStore } from "react";

// Whether the current room has finished compiling its shaders and is showing.
// The World's Warmup sets it; the HUD shows a loading veil until it is true.
const listeners = new Set<() => void>();
let ready = false;

export function setSceneReady(next: boolean): void {
  if (next === ready) return;
  ready = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For frame loops: read without subscribing. */
export function isSceneReady(): boolean {
  return ready;
}

export function useSceneReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}
