// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { chromium, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
/** Waits for the street furniture models (CityFurniture sets data-furniture). */
const furnitureReady = async (page: Page) => {
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.furniture === "ready",
    null,
    { timeout: 300_000 },
  );
};
/** Waits for the New York bays and the furniture (NycFacades sets data-bays). */
const cityReady = async (page: Page) => {
  await furnitureReady(page);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.bays === "ready",
    null,
    { timeout: 300_000 },
  );
};
/** A shot with a saved pet: seeds the save, reloads and waits for the pet. */
function petShot(
  name: string,
  query: string,
  kind: string,
  petName: string,
): (typeof SHOTS)[number] {
  return {
    name,
    query,
    live: true,
    act: async (page) => {
      await page.evaluate(
        ([k, n]) => {
          localStorage.setItem(
            "daydaze-save-v1",
            JSON.stringify({
              pet: { kind: k, name: n, adoptedAt: 1, fedAt: Date.now() },
            }),
          );
        },
        [kind, petName],
      );
      await page.reload();
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
        undefined,
        { timeout: 150_000 },
      );
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.petClip !== undefined,
        undefined,
        { timeout: 150_000 },
      );
    },
  };
}

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
  { name: "dome", query: "room=dome" },
  { name: "kamayan-hall", query: "room=kamayan-hall" },
  { name: "galleria", query: "room=galleria" },
  { name: "roller-rink", query: "room=roller-rink" },
  { name: "skatepark", query: "room=skatepark" },
  { name: "gridiron", query: "room=gridiron" },
  { name: "driving-range", query: "room=driving-range" },
  { name: "marina", query: "room=marina" },
  { name: "courtside", query: "room=courtside" },
  { name: "catwalk", query: "room=catwalk" },
  { name: "mermaid-cove", query: "room=mermaid-cove" },
  { name: "open-water", query: "room=open-water" },
  { name: "open-water-full", query: "room=open-water&view=full" },
  { name: "reef-dive", query: "room=reef-dive" },
  {
    // swimming out past the lane buoys, strokes and all, fish below
    name: "open-water-swim",
    query: "room=open-water&at=2,-9&yaw=3.14&view=full",
    live: true,
    act: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.keyboard.down("w");
      await page.waitForTimeout(6_000);
    },
  },
  {
    // a diver on the reef: tank, mask, bubbles, the gauge, the log
    name: "reef-dive-swim",
    query: "room=reef-dive&at=0,-4&yaw=3.14&view=full",
    live: true,
    act: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.keyboard.down("w");
      await page.waitForTimeout(6_000);
    },
  },
  { name: "skate-diner", query: "room=skate-diner" },
  { name: "museum", query: "room=museum" },
  { name: "salon", query: "room=salon" },
  { name: "laser-tag", query: "room=laser-tag" },
  { name: "market", query: "room=market" },
  { name: "paintball", query: "room=paintball" },
  { name: "music-studio", query: "room=music-studio" },
  { name: "zoo", query: "room=zoo" },
  // close on the savanna: the static giraffes and the zebras
  { name: "zoo-savanna", query: "room=zoo&cam=-8,3.2,-1,-13,1,-9" },
  // close on the elephants and the lions' rocks
  { name: "zoo-elephants", query: "room=zoo&cam=8,3.4,-1,13,1.2,-9" },
  { name: "dealership", query: "room=dealership" },
  { name: "jazz-club", query: "room=jazz-club" },
  { name: "vinyl-vault", query: "room=vinyl-vault" },
  { name: "back-room", query: "room=back-room" },
  { name: "tiki-bar", query: "room=tiki-bar" },
  { name: "thrift-temple", query: "room=thrift-temple" },
  { name: "espresso-lab", query: "room=espresso-lab" },
  { name: "hotel-rooftop", query: "room=hotel-rooftop" },
  { name: "bookshop", query: "room=bookshop" },
  { name: "patisserie", query: "room=patisserie" },
  { name: "gallery", query: "room=gallery" },
  { name: "surf-shack", query: "room=surf-shack" },
  { name: "boardwalk-arcade", query: "room=boardwalk-arcade" },
  { name: "drive-in", query: "room=drive-in" },
  { name: "wine-bar", query: "room=wine-bar" },
  { name: "video-store", query: "room=video-store" },
  { name: "green-haze", query: "room=green-haze&adult=1" },
  { name: "piercing", query: "room=piercing" },
  { name: "halo-halo-cafe", query: "room=halo-halo-cafe" },
  { name: "ramen-shop", query: "room=ramen-shop" },
  { name: "sushi-bar", query: "room=sushi-bar" },
  { name: "lune", query: "room=lune" },
  { name: "bistro", query: "room=bistro" },
  { name: "gym", query: "room=gym" },
  { name: "stadium", query: "room=stadium" },
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
  // your adopted pet beside you in the city, and asleep in its bed at home
  petShot("pet-city", "room=city&view=full&time=12:00", "husky", "Biscuit"),
  petShot("pet-home", "room=apartment", "shibainu", "Kiko"),
  { name: "city-street", query: "room=city&view=full", act: cityReady },
  { name: "city-overview", query: "room=city" },
  // the city by day and at sunset (daylight.ts), pinned with ?time=
  {
    name: "city-day",
    query: "room=city&view=full&time=12:00",
    act: cityReady,
  },
  {
    name: "city-day-overview",
    query: "room=city&time=12:00",
    act: cityReady,
  },
  // the New York blocks from the street (src/game/city/nyc.ts), by day and at night
  ...[
    ["nyc-street", "12:00", "-30,-6", 0],
    ["nyc-night", "22:00", "-30,-6", 0],
    ["nyc-corner", "12:00", "-70,-8", Math.PI / 2],
  ].map(([name, time, at, yaw]) => ({
    name: String(name),
    query: `room=city&view=full&time=${time}&at=${at}&yaw=${yaw}`,
    live: true,
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(640, 400);
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 100);
    },
  })),
  { name: "city-sunset", query: "room=city&view=full&time=19:30" },
  {
    name: "city-night",
    query: "room=city&view=full&time=23:00",
    act: furnitureReady,
  },
  // the avenue sidewalk with its street furniture (src/client/city/CityFurniture.tsx)
  {
    name: "city-sidewalk",
    query: "room=city&view=full&time=12:00&at=-36,9.5",
    act: furnitureReady,
  },
  {
    // a signal head at a crossing, its lit bulbs cycling (Traffic.tsx)
    name: "city-signal",
    query: "room=city&view=full&time=12:00&at=-47,9.5",
    act: furnitureReady,
  },
  {
    // the palms stand on Shore Boulevard and the beach only
    name: "city-palms",
    query: "room=city&view=full&time=12:00&at=-100,262",
    act: furnitureReady,
  },
  {
    // Uptown's Park and Gardens (src/game/city/park.ts): the fountain plaza,
    // paths, pond, bandstand and picnics
    name: "city-park",
    query: "room=city&view=full&time=14:00&at=254,-280",
    act: furnitureReady,
  },
  {
    // the park's entrance from Park Avenue, flanked by trees
    name: "city-park-entrance",
    query: "room=city&view=full&time=14:00&at=254,-262",
    act: furnitureReady,
  },
  {
    name: "city-park-pond",
    query: "room=city&view=full&time=14:00&at=233,-290",
    act: furnitureReady,
  },
  {
    name: "city-sidewalk-night",
    query: "room=city&view=full&time=23:00&at=-36,9.5",
    act: furnitureReady,
  },
  {
    // the game menu open over the city: everything not needed this moment
    name: "city-menu",
    query: "room=city&view=full",
    act: async (page) => {
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
        null,
        { timeout: 300_000 },
      );
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    },
  },
  {
    name: "credits",
    query: "room=city&view=full",
    act: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Credits", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Credits", exact: true }),
      ).toBeVisible();
    },
  },
  {
    name: "credits-mobile",
    query: "room=city&view=full",
    viewport: { width: 390, height: 844 },
    touch: true,
    act: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Credits", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Credits", exact: true }),
      ).toBeVisible();
    },
  },
  {
    // the wheel zooms from the overview all the way in on her face
    name: "city-zoom",
    query: "room=city",
    live: true,
    act: async (page) => {
      const canvas = page.locator("canvas");
      await canvas.waitFor();
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(640, 400);
      for (let i = 0; i < 60; i++) await page.mouse.wheel(0, -100);
      await page.waitForFunction(
        () => Number(document.querySelector("canvas")?.dataset.camDistance) < 1,
        null,
        { timeout: 120_000 },
      );
    },
  },
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
      await page.getByRole("button", { name: "Menu", exact: true }).click();
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
  // a fresh save would show the first-visit walkthrough in every shot
  await page.addInitScript(() => {
    const key = "daydaze-save-v1";
    const save = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!("onboarded" in save))
      localStorage.setItem(key, JSON.stringify({ ...save, onboarded: true }));
  });
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
