// Frame-time profile per area: loads each area cold (fresh context), waits for
// data-frames=10, then samples SAMPLE_MS standing and (city areas) walking.
// SwiftShader renders on the CPU, so absolute numbers are only a relative
// measure; the useful ones are JS script time per frame, long tasks and heap.
// Usage (against `npm run preview` on 4173):
//   BASE_URL=http://localhost:4173 node --experimental-strip-types scripts/perf-profile.ts [area...]
// Areas: spawn nightlife park beachside pulse (default: all).
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const AREAS: Record<string, string> = {
  spawn: "room=city&time=14:00&at=45,11",
  nightlife: "room=city&time=23:00&at=120,10",
  park: "room=city&time=14:00&at=254,-280",
  beachside: "room=city&time=14:00&at=-100,262",
  pulse: "room=pulse",
};
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(AREAS);
const SAMPLE_MS = Number(process.env.SAMPLE_MS ?? 6000);
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
type Win = { __long: number[]; __ft: number[] };
for (const name of names) {
  const query = AREAS[name];
  if (!query) continue;
  const ctx = await browser.newContext({
    viewport: { width: 640, height: 400 },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem(
      "daydaze-save-v1",
      JSON.stringify({ onboarded: true }),
    );
    const w = window as unknown as Win;
    w.__long = [];
    w.__ft = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__long.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
    let last = 0;
    const tick = (t: number) => {
      if (last) w.__ft.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  const t0 = Date.now();
  await page.goto(`${BASE}/?quality=low&${query}`);
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames ?? 0) >= 10,
    undefined,
    { timeout: 900_000, polling: 100 },
  );
  const ten = Date.now() - t0;
  const metrics = async () =>
    Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((x) => [
        x.name,
        x.value,
      ]),
    );
  const stats = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y);
    const q = (p: number) =>
      s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? 0;
    return {
      n: s.length,
      mean: a.reduce((x, y) => x + y, 0) / Math.max(1, a.length),
      p95: q(0.95),
      max: s[s.length - 1] ?? 0,
    };
  };
  const phases = name === "pulse" ? ["stand"] : ["stand", "walk"];
  const rows: string[] = [];
  for (const phase of phases) {
    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.__long = [];
      w.__ft = [];
    });
    if (phase === "walk") await page.keyboard.down("w");
    const a = await metrics();
    // PROFILE=<prefix> also writes a V8 CPU profile of each sampling window
    // (summarize with scripts/cpuprofile-top.ts)
    if (process.env.PROFILE) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
      await cdp.send("Profiler.start");
    }
    await page.waitForTimeout(SAMPLE_MS);
    const b = await metrics();
    if (process.env.PROFILE) {
      const { profile } = await cdp.send("Profiler.stop");
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        `${process.env.PROFILE}-${name}-${phase}.cpuprofile`,
        JSON.stringify(profile),
      );
    }
    if (phase === "walk") await page.keyboard.up("w");
    const { long, ft, calls, tris } = await page.evaluate(() => {
      const w = window as unknown as Win;
      const c = document.querySelector("canvas")?.dataset;
      return {
        long: w.__long,
        ft: w.__ft,
        calls: c?.calls,
        tris: c?.triangles,
      };
    });
    const f = stats(ft);
    const l = stats(long);
    const script =
      ((b.ScriptDuration - a.ScriptDuration) * 1000) / Math.max(1, f.n);
    const task = ((b.TaskDuration - a.TaskDuration) * 1000) / Math.max(1, f.n);
    const gc = (b.JSHeapUsedSize - a.JSHeapUsedSize) / 1e6;
    rows.push(
      `  ${phase}: frames ${f.n} mean ${f.mean.toFixed(0)} p95 ${f.p95.toFixed(0)} max ${f.max.toFixed(0)} ms | script/frame ${script.toFixed(1)} ms task/frame ${task.toFixed(1)} ms | long ${l.n} sum ${long.reduce((x, y) => x + y, 0).toFixed(0)} ms | heap ${(b.JSHeapUsedSize / 1e6).toFixed(0)} MB (d ${gc.toFixed(1)}) | calls ${calls} tris ${tris}`,
    );
  }
  console.log(`${name}: ten-frames ${ten} ms`);
  for (const r of rows) console.log(r);
  await ctx.close();
}
await browser.close();
