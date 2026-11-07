// Cold-load profile: for each room URL, a fresh browser context (empty cache)
// loads the built app and we time first rendered frame and the tenth, plus
// transferred bytes, requests, long main-thread tasks and CDP script/task time.
// Usage (against `npm run preview`):
//   BASE_URL=http://localhost:4173 node --experimental-strip-types scripts/load-profile.ts city plaza ...
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const rooms = process.argv.slice(2);
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
for (const room of rooms) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const key = "daydaze-save-v1";
    localStorage.setItem(key, JSON.stringify({ onboarded: true }));
    (window as unknown as { __long: number[] }).__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        (window as unknown as { __long: number[] }).__long.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
  });
  let bytes = 0;
  let reqs = 0;
  const big: [number, string][] = [];
  page.on("response", async (r) => {
    reqs++;
    const len = Number((await r.headerValue("content-length")) ?? 0);
    bytes += len;
    if (len > 200_000) big.push([len, r.url().replace(BASE, "")]);
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  if (process.env.PROFILE) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
    await cdp.send("Profiler.start");
  }
  const t0 = Date.now();
  await page.goto(`${BASE}/?quality=low&room=${room}`);
  const frames = (n: number) =>
    page.waitForFunction(
      (k) => Number(document.querySelector("canvas")?.dataset.frames ?? 0) >= k,
      n,
      { timeout: 900_000, polling: 100 },
    );
  await frames(1);
  const first = Date.now() - t0;
  await frames(10);
  const ten = Date.now() - t0;
  const m = Object.fromEntries(
    (await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]),
  );
  if (process.env.PROFILE) {
    const { profile } = await cdp.send("Profiler.stop");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`${process.env.PROFILE}-${room}.cpuprofile`, JSON.stringify(profile));
  }
  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  console.log(
    `${room}: first ${first} ms, ten ${ten} ms, ${reqs} req, ${(bytes / 1e6).toFixed(1)} MB, ` +
      `script ${(m.ScriptDuration * 1000).toFixed(0)} ms, task ${(m.TaskDuration * 1000).toFixed(0)} ms, ` +
      `long tasks ${long.length} (max ${Math.max(0, ...long).toFixed(0)} ms, sum ${long.reduce((a, b) => a + b, 0).toFixed(0)} ms)`,
  );
  big.sort((a, b) => b[0] - a[0]);
  for (const [l, u] of big.slice(0, 6)) console.log(`   ${(l / 1e6).toFixed(2)} MB ${u}`);
  await ctx.close();
}
await browser.close();
