// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { chromium, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
const SHOTS: {
  name: string;
  query: string;
  viewport?: { width: number; height: number };
  /** Live shots keep the frame loop running, so a ride can move between frames. */
  live?: boolean;
  touch?: boolean;
  /** Drives the scene before the capture, e.g. to start a race. */
  act?: (page: Page) => Promise<void>;
}[] = [
  { name: "club-pulse", query: "room=pulse" },
  {
    name: "apartment",
    query: "room=apartment",
    act: async (page) => {
      for (const [piece, cell] of [
        ["Velvet sofa", "Empty cell 2, 2"],
        ["Scalloped rug", "Empty cell 2, 4"],
        ["Floor lamp", "Empty cell 1, 1"],
      ]) {
        await page.getByRole("button", { name: piece }).click();
        await page.getByRole("button", { name: cell }).click();
      }
    },
  },
  {
    name: "jail",
    query: "room=jail",
    act: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "daydaze-save-v1",
          JSON.stringify({ jail: { endsAt: Date.now() + 180_000 } }),
        );
      });
      await page.reload();
      await expect(page.getByRole("timer")).toContainText("Time left");
    },
  },
  {
    name: "club-pulse-mobile",
    query: "room=pulse",
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  { name: "lesbian-bar", query: "room=violet-hour" },
  {
    name: "minigame-from-world",
    query: "room=velvet-room",
    act: async (page) => {
      await page
        .getByRole("button", { name: "Play Last Call at the bar" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 120_000 });
    },
  },
  { name: "velvet-room", query: "room=velvet-room" },
  { name: "rooftop-bar", query: "room=rooftop-bar" },
  { name: "sugar-rush", query: "room=sugar-rush" },
  { name: "warehouse", query: "room=warehouse" },
  { name: "karaoke", query: "room=karaoke" },
  { name: "bowling", query: "room=bowling" },
  { name: "arcade-bar", query: "room=arcade-bar" },
  { name: "la-noche", query: "room=la-noche" },
  { name: "mini-golf", query: "room=mini-golf" },
  { name: "velvet-room-full-look", query: "room=velvet-room&view=full" },
  { name: "velvet-room-detail", query: "room=velvet-room&view=detail" },
  { name: "club-pulse-detail", query: "room=pulse&view=detail" },
  { name: "lesbian-bar-detail", query: "room=violet-hour&view=detail" },
  { name: "plaza-detail", query: "room=plaza&view=detail" },
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
  { name: "aquarium", query: "room=aquarium" },
  { name: "ice-rink", query: "room=ice-rink" },
  { name: "haunted-house", query: "room=haunted-house" },
  { name: "city-street", query: "room=city&view=full" },
  { name: "city-overview", query: "room=city" },
  {
    name: "city-mobile",
    query: "room=city&view=full",
    viewport: { width: 390, height: 844 },
    touch: true,
  },
  { name: "speedway-grid", query: "room=speedway" },
  { name: "cars-lineup", query: "room=speedway&lineup=cars" },
  {
    name: "speedway-racing",
    query: "room=speedway",
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Race the Neon Oval" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "racing", {
        timeout: 120_000,
      });
      await page.keyboard.down("KeyW");
    },
  },
  {
    name: "speedway-bumper",
    query: "room=speedway",
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Bumper cars" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "bumpers");
    },
  },
  {
    name: "speedway-mobile",
    query: "room=speedway",
    viewport: { width: 390, height: 844 },
    touch: true,
    live: true,
    act: async (page) => {
      const canvas = page.getByRole("img", { name: "3D room view" });
      await page.getByRole("button", { name: "Race the Neon Oval" }).click();
      await expect(canvas).toHaveAttribute("data-race-phase", "racing", {
        timeout: 120_000,
      });
    },
  },
  { name: "point-and-eat-kitchen", query: "room=filipino-joint" },
  { name: "jade-whisk-boba-matcha", query: "room=boba-matcha" },
  { name: "purple-pandesal-ube", query: "room=ube-bakery" },
  {
    name: "plate-rush-app",
    query: "room=city",
    act: async (page) => {
      await page.getByRole("button", { name: "Plate Rush" }).click();
      await expect(
        page.getByRole("dialog", { name: "Plate Rush" }),
      ).toBeVisible();
    },
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
for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  // a phone shot needs touch on, so the stick shows and pointer:coarse matches
  const page = await browser.newPage({
    viewport: shot.viewport ?? { width: 1280, height: 800 },
    isMobile: shot.touch ?? false,
    hasTouch: shot.touch ?? false,
  });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  const started = Date.now();
  await page.setViewportSize(shot.viewport ?? { width: 1280, height: 800 });
  const still = shot.live ? "" : "&still=1";
  await page.goto(`${BASE}/?quality=low${still}&${shot.query}`);
  if (shot.act) await shot.act(page);
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
  await page.close();
}
await browser.close();
