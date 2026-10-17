import { useSyncExternalStore } from "react";

/** A module-level state the 3D scene and the overlay both read: `get` for
 * frame loops, `use` for components, `set` merges and notifies. */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };
  const get = () => state;
  return {
    get,
    set(next: Partial<T>) {
      state = { ...state, ...next };
      for (const l of listeners) l();
    },
    use: () => useSyncExternalStore(subscribe, get, get),
  };
}
