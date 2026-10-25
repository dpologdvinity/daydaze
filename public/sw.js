// Daydaze's service worker: return visits load from its cache.
//
// - The game's files (the fingerprinted /assets/ bundle, and the models,
//   textures, sky maps and closet art in public/) are cache-first: once
//   stored, they never touch the network again for this version.
// - Pages (navigations) are network-first, so a new deploy shows at once;
//   the cached page is only the fallback when the network is down.
// - /api and /ws are never touched: they pass straight to the network.
//
// The cache is named after the build (`/sw.js?v=<build id>`, registered by
// src/client/serviceWorker.ts). A new build is a new worker with a new cache;
// it waits until the player says to reload (the update prompt posts
// "skip-waiting"), then deletes the old version's cache.

const VERSION = new URL(self.location.href).searchParams.get("v") ?? "dev";
const PREFIX = "daydaze-";
const CACHE = `${PREFIX}${VERSION}`;

/** Files that never change within a version: cache-first. */
const STATIC = /^\/(assets|models|textures|hdri|closet|doll)\//;
/** Never cached, never answered by the worker. */
const NETWORK_ONLY = /^\/(api|ws)(\/|$)/;

/** Which way the worker answers a request, or null to leave it alone. */
function strategy(request) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (NETWORK_ONLY.test(url.pathname)) return null;
  if (request.mode === "navigate") return "network-first";
  if (STATIC.test(url.pathname)) return "cache-first";
  return null;
}

/** Only whole, same-origin, successful responses are worth keeping. */
function keepable(response) {
  return response.ok && response.status === 200 && response.type === "basic";
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (keepable(response)) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  // one copy of the page, whatever its ?room= or ?quality= flags
  const key = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    if (keepable(response)) await cache.put(key, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith(PREFIX) && name !== CACHE)
          await caches.delete(name);
      // take over the open page now, so the rest of its files get cached
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const how = strategy(event.request);
  if (how === "cache-first") event.respondWith(cacheFirst(event.request));
  else if (how === "network-first")
    event.respondWith(networkFirst(event.request));
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data === "skip-waiting") {
    self.skipWaiting();
    return;
  }
  // the files the page fetched before this worker took over
  if (data && data.type === "warm" && Array.isArray(data.urls))
    event.waitUntil(warm(data.urls));
});

async function warm(urls) {
  const cache = await caches.open(CACHE);
  for (const href of urls) {
    if (typeof href !== "string") continue;
    const request = new Request(href);
    if (strategy(request) !== "cache-first") continue;
    if (await cache.match(request)) continue;
    try {
      const response = await fetch(request);
      if (keepable(response)) await cache.put(request, response);
    } catch {
      // offline or gone: it is cached on its next use instead
    }
  }
}
