// Registers public/sw.js in production builds, so return visits load the
// game's files from its cache, and tracks a new version waiting to take over
// (the UpdatePrompt offers the reload). Development never registers it: a
// cache-first worker would hide every edit behind a stale copy.

import { createStore } from "./rooms/shared/store.ts";

/** Set per build in vite.config.ts; names the worker's cache. */
declare const __BUILD_ID__: string;

/** A new version, installed and waiting for the player to reload. */
export const update = createStore<{ waiting: ServiceWorker | null }>({
  waiting: null,
});

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // once the worker controls the page, every later fetch goes through it;
  // hand it the files this page loaded before that, so they're cached too
  const warm = () => {
    const urls = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((u) => u.startsWith(location.origin));
    sw.controller?.postMessage({ type: "warm", urls });
  };
  if (sw.controller) warm();
  else sw.addEventListener("controllerchange", warm, { once: true });
  sw.register(`/sw.js?v=${encodeURIComponent(__BUILD_ID__)}`)
    .then((reg) => {
      // with no controller, this is the first install, not an update
      const offer = (w: ServiceWorker | null) => {
        if (w && sw.controller) update.set({ waiting: w });
      };
      offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed") offer(next);
        });
      });
    })
    .catch((error: unknown) => console.warn("No offline cache", error));
}

/** Lets the waiting version take over, then reloads into it. */
export function applyUpdate(): void {
  const waiting = update.get().waiting;
  if (!waiting) return;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => location.reload(),
    { once: true },
  );
  waiting.postMessage("skip-waiting");
}
