// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
const SHOTS: { name: string; query: string }[] = [
  { name: "velvet-room", query: "room=velvet-room" },
  { name: "velvet-room-full-look", query: "room=velvet-room&view=full" },
  { name: "plaza", query: "room=plaza" },
  { name: "plaza-face", query: "room=plaza&view=face" },
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
  await page.goto(`${BASE}/?quality=low&still=1&${shot.query}`);
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
  await page.screenshot({ path: `docs/screenshots/${shot.name}.png` });
  console.log(
    `${shot.name}: ${last} frames, ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
}
await browser.close();
