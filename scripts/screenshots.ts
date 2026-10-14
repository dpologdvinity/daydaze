// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
const SHOTS: {
  name: string;
  query: string;
  viewport?: { width: number; height: number };
  /** Live shots keep the frame loop running, so a ride can move between frames. */
  live?: boolean;
}[] = [
  { name: "velvet-room", query: "room=velvet-room" },
  { name: "velvet-room-full-look", query: "room=velvet-room&view=full" },
  { name: "plaza", query: "room=plaza" },
  { name: "plaza-face", query: "room=plaza&view=face" },
  { name: "water-park-wide", query: "room=water-park" },
  { name: "water-park-swimsuit", query: "room=water-park&view=full" },
  {
    name: "water-park-slide",
    query: "room=water-park&slide=0.45",
    live: true,
  },
  {
    name: "water-park-mobile",
    query: "room=water-park",
    viewport: { width: 390, height: 844 },
  },
  { name: "amusement-park-wide", query: "room=amusement-park" },
  {
    name: "amusement-park-coaster",
    query: "room=amusement-park&ride=coaster",
    live: true,
  },
  {
    name: "amusement-park-mobile",
    query: "room=amusement-park",
    viewport: { width: 390, height: 844 },
  },
];

const only = process.argv.slice(2);
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  const started = Date.now();
  await page.setViewportSize(shot.viewport ?? { width: 1280, height: 800 });
  const still = shot.live ? "" : "&still=1";
  await page.goto(`${BASE}/?quality=low${still}&${shot.query}`);
  // wait until the demand loop has rendered and then gone quiet for 8 s
  let last = "";
  let quietSince = Date.now();
  while (Date.now() - quietSince < 8000) {
    await page.waitForTimeout(1000);
    const frames =
      (await page
        .locator("canvas")
        .getAttribute("data-frames")
        .catch(() => null)) ?? "";
    if (frames !== last) {
      last = frames;
      quietSince = Date.now();
    }
    if (Date.now() - started > 600_000) break;
  }
  // a live frame loop can make the capture wait a long time on SwiftShader
  await page.screenshot({
    path: `docs/screenshots/${shot.name}.png`,
    timeout: 180_000,
  });
  // renderer stats for the first frames: draw calls and triangles
  const canvas = page.getByRole("img", { name: "3D room view" });
  const calls = await canvas.getAttribute("data-calls");
  const triangles = await canvas.getAttribute("data-triangles");
  console.log(
    `${shot.name}: ${last} frames, ${calls} draw calls, ${triangles} triangles, ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
}
await browser.close();
