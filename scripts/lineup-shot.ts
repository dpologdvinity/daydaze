// Screenshots one shot of the doll lineup page into docs/screenshots/doll-<shot>.png.
//   BASE_URL=http://localhost:5201 node --experimental-strip-types scripts/lineup-shot.ts cropped [men=1]
// Needs a dev server. The lineup renders on the CPU, so it waits for the
// frame counter to go quiet before capturing.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
const [shot = "lineup", ...extra] = process.argv.slice(2);
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(
  `${BASE}/src/client/avatar/lineup.html?human=1&shot=${shot}${extra.length ? "&" + extra.join("&") : ""}`,
  { timeout: 240_000 },
);
await page.locator("canvas").waitFor();
// the models load lazily: give them time, then let the frame loop settle
await page.waitForTimeout(60_000);
await page.screenshot({
  path: `docs/screenshots/doll-${shot}.png`,
  timeout: 180_000,
});
await browser.close();
console.log("wrote", `docs/screenshots/doll-${shot}.png`);
