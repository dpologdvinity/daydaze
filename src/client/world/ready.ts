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

/**
 * Runs `work` once, as soon as a room is on screen, or after `fallbackMs`
 * if none ever is (a lab page with no world). For downloads the first room
 * doesn't need (motion capture, NPC lines): they wait rather than share the
 * bandwidth the room is loading over.
 */
export function afterSceneReady(work: () => void, fallbackMs: number): void {
  if (ready) {
    work();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    listeners.delete(onChange);
    clearTimeout(timer);
    work();
  };
  const onChange = () => {
    if (ready) run();
  };
  listeners.add(onChange);
  const timer = setTimeout(run, fallbackMs);
}
