// The service worker (public/sw.js) against a production build: a second
// visit takes the game's code, models and textures from its cache.

import { expect, test } from "@playwright/test";

const ROOM = "/?quality=low&still=1&room=velvet-room";

test("a second visit loads the game's files from the service worker", async ({
  page,
}) => {
  await page.goto(ROOM);
  // the first visit installs the worker, which takes over the page
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
  );
  await expect(page.locator(".loading-veil")).toHaveCount(0);
  const files: { url: string; fromWorker: boolean }[] = [];
  page.on("response", (r) => {
    const path = new URL(r.url()).pathname;
    if (/^\/(assets|models|textures)\//.test(path))
      files.push({ url: path, fromWorker: r.fromServiceWorker() });
  });
  await page.reload();
  await expect(page.locator(".loading-veil")).toHaveCount(0);
  expect(files.length).toBeGreaterThan(0);
  // every one of them came out of the worker's cache, none from the network
  expect(files.filter((f) => !f.fromWorker)).toEqual([]);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const r of await (await caches.open(name)).keys()) urls.push(r.url);
    return urls;
  });
  // and the worker answered from its cache: each one is stored there
  const stored = new Set(cached.map((u) => new URL(u).pathname));
  expect(files.filter((f) => !stored.has(f.url))).toEqual([]);
  expect(cached.some((u) => u.includes("/assets/"))).toBe(true);
  expect(cached.filter((u) => /\/(api|ws)\//.test(u))).toEqual([]);
});
