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
// "skip-waiting"), then deletes the old version's cache. Meanwhile a page
// already running the new build (pages are network-first) tells this older
// worker its build ("hello"); the art it asks for then skips this version's
// cache, so new code never gets old models under the same file names.

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

/** Each open page's build, by client id, from its "hello" message. The
 * browser stops idle workers, so a copy is kept in a small cache too (its
 * name has the prefix, so the next version's activation clears it). */
const builds = new Map();
const BUILDS = `${PREFIX}builds`;

async function buildOf(clientId) {
  if (!clientId) return undefined;
  if (builds.has(clientId)) return builds.get(clientId);
  const hit = await (await caches.open(BUILDS)).match(`/__build/${clientId}`);
  const build = hit ? await hit.text() : undefined;
  builds.set(clientId, build);
  return build;
}

/** Only whole, same-origin, successful responses are worth keeping. */
function keepable(response) {
  return response.ok && response.status === 200 && response.type === "basic";
}

/** Stores a copy without holding up the response; a full or evicted cache
 * just means the file is fetched again next time. */
function keep(event, cache, key, response) {
  if (keepable(response))
    event.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}

async function cacheFirst(event) {
  const request = event.request;
  // a page from another build gets the network, not this version's files
  const build = await buildOf(event.clientId);
  if (build !== undefined && build !== VERSION) return fetch(request);
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  return keep(event, cache, request, await fetch(request));
}

async function networkFirst(event) {
  const request = event.request;
  const cache = await caches.open(CACHE);
  // one copy of the page, whatever its ?room= or ?quality= flags
  const key = new URL(request.url).pathname;
  try {
    return keep(event, cache, key, await fetch(request));
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
  if (how === "cache-first") event.respondWith(cacheFirst(event));
  else if (how === "network-first") event.respondWith(networkFirst(event));
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data === "skip-waiting") {
    self.skipWaiting();
    return;
  }
  if (
    data &&
    data.type === "hello" &&
    typeof data.build === "string" &&
    event.source
  ) {
    builds.set(event.source.id, data.build);
    event.waitUntil(
      caches
        .open(BUILDS)
        .then((c) =>
          c.put(`/__build/${event.source.id}`, new Response(data.build)),
        )
        .catch(() => undefined),
    );
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
