// Captures review screenshots of each room into docs/screenshots/.
// Needs a dev server: `npm run dev -- --port 5195 --strictPort`, then
// `node --experimental-strip-types scripts/screenshots.ts [name...]`.
import { chromium, expect, type Page } from "@playwright/test";
import {
  FURNITURE_CATALOG,
  FURNITURE_IDS,
  placeFurniture,
  type Furniture,
} from "../src/game/home/decor.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
/** Waits for the street furniture models (CityFurniture sets data-furniture). */
const furnitureReady = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      return (
        canvas?.dataset.furniture === "ready" &&
        Number(canvas.dataset.frames) >= 6
      );
    },
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
/** Waits for either the New York bays or Suburbia's houses (a shot may see only one). */
const blocksReady = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const d = document.querySelector("canvas")?.dataset;
      return d?.bays === "ready" || d?.houses === "ready";
    },
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

/** Every floor piece packed greedily onto the grid, front to the camera; the
 * pieces that no longer fit go to the next page. Used to check each model. */
function catalogPages(): Furniture[][] {
  let rest = FURNITURE_IDS.filter((id) => !FURNITURE_CATALOG[id].wall);
  const pages: Furniture[][] = [];
  while (rest.length > 0) {
    let items: Furniture[] = [];
    const left: typeof rest = [];
    for (const id of rest) {
      let placed = false;
      for (let r = 0; r < 6 && !placed; r++)
        for (let c = 0; c < 8 && !placed; c++) {
          const next = placeFurniture(items, id, [c, r], 0);
          if (next) {
            items = next;
            placed = true;
          }
        }
      if (!placed) left.push(id);
    }
    pages.push(items);
    rest = left;
  }
  return pages;
}

const at = (
  id: Furniture["id"],
  c: number,
  r: number,
  variant = 0,
  rotation: Furniture["rotation"] = 0,
): Furniture =>
  variant > 0
    ? { id, cell: [c, r], rotation, variant }
    : { id, cell: [c, r], rotation };

/** A shot of the apartment with this furniture already saved. */
function homeShot(name: string, furniture: readonly Furniture[], cam?: string) {
  return {
    name,
    query: `room=apartment${cam ? `&cam=${cam}` : ""}`,
    act: async (page: Page) => {
      await page.evaluate((f) => {
        localStorage.setItem(
          "daydaze-save-v1",
          JSON.stringify({ home: { locked: true, furniture: f } }),
        );
      }, furniture);
      await page.reload();
      // fold the furniture lists so the panel leaves the room in view
      await page.evaluate(() => {
        for (const d of document.querySelectorAll(".home-panel details"))
          d.removeAttribute("open");
      });
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
  homeShot("apartment-furnished", [
    at("plant", 0, 0),
    at("tv", 1, 0),
    at("sofa", 3, 0, 1),
    at("lamp", 6, 0),
    at("armchair", 2, 2, 3),
    at("coffee-table", 3, 1),
    at("table-small", 5, 1),
    at("rug", 3, 3, 3),
    at("bed", 6, 2, 2),
    at("nightstand", 5, 2, 2),
    at("desk", 0, 4),
    at("office-chair", 0, 5, 1),
    at("bookshelf", 1, 5, 1),
    at("fridge", 3, 5),
    at("oven", 4, 5),
    at("kitchen-sink", 5, 5),
    at("toilet", 7, 5),
    at("wall-art", 0, 0, 2),
    at("wall-neon", 4, 0, 1),
    at("wall-mirror", 6, 0),
  ]),
  ...catalogPages().map((page, i) =>
    homeShot(`apartment-catalog-${i + 1}`, page, "0,7.5,6,0,0.4,0.5"),
  ),
  homeShot(
    "apartment-tv",
    [at("tv", 3, 2), at("tv-flat", 3, 4)],
    "0,3,5,0,0.3,0.5",
  ),
  homeShot(
    "apartment-catalog-wall",
    [
      at("wall-art", 0, 0, 5),
      at("wall-art-wide", 4, 0, 4),
      at("wall-shelf", 6, 0),
    ],
    "0,3,8,0,1.6,-3",
  ),
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
  { name: "orbit", query: "room=orbit" },
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
  { name: "yacht", query: "room=yacht" },
  { name: "courtside", query: "room=courtside" },
  { name: "catwalk", query: "room=catwalk" },
  { name: "mermaid-cove", query: "room=mermaid-cove" },
  {
    name: "mermaid-cove-rocks",
    query: "room=mermaid-cove&cam=-2,2.4,1.5,-6.5,1.1,-3.3",
  },
  { name: "open-water", query: "room=open-water" },
  { name: "open-water-whale", query: "room=open-water&cam=8,4,-40,8,-1,-64" },
  { name: "open-water-full", query: "room=open-water&view=full" },
  { name: "reef-dive", query: "room=reef-dive" },
  {
    name: "reef-dive-deep",
    query: "room=reef-dive&at=3,-14&yaw=3.14&view=full",
  },
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
  // the big cats' rocks (lions and tigers) and the woods (bear and elk)
  { name: "zoo-bigcats", query: "room=zoo&cam=-13,3.2,-2.5,-13,1,4" },
  {
    name: "park-deer",
    query:
      "room=city&quality=high&time=14:00&at=268,-279&cam=277,26,-250,277,0,-277",
    act: furnitureReady,
  },
  { name: "zoo-woods", query: "room=zoo&cam=0,7,2,0,1,-6.2" },
  { name: "forest", query: "room=forest" },
  { name: "forest-path", query: "room=forest&cam=2,3,2,-1,1.2,-10" },
  { name: "forest-top", query: "room=forest&cam=0,26,8,0,0,-4" },
  { name: "forest-creek", query: "room=forest&cam=2,7,-4,1,0,-14" },
  { name: "forest-lookout", query: "room=forest&cam=7,3.4,-34,7,1.6,-46" },
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
  { name: "clay-day", query: "room=pottery" },
  { name: "florist", query: "room=florist" },
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
  petShot("pet-lab", "room=city&view=full&time=12:00", "labrador", "Maple"),
  { name: "city-street", query: "room=city&view=full&time=12:00&at=45,11" },
  {
    name: "transit-city-street-before",
    query: "room=city&view=full&time=12:00&at=45,11",
  },
  {
    name: "transit-bus-stop-before",
    query: "room=city&view=full&time=12:00&at=-24,13",
  },
  {
    name: "transit-bus-stop",
    query: "room=city&view=full&time=12:00&at=-24,13",
  },
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
    ["nyc-manila", "12:00", "-262,-6", 0],
    ["nyc-chinatown", "12:00", "262,-6", 0],
    ["nyc-suburbia", "12:00", "-404,-236", 0],
    ["el-station", "12:00", "10,12", 0],
    ["el-train", "12:00", "-6,14&elat=69", 0],
  ].map(([name, time, at, yaw]) => ({
    name: String(name),
    query: `room=city&view=full&time=${time}&at=${at}&yaw=${yaw}`,
    live: true,
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await blocksReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
      await page.mouse.move(640, 400);
      for (let i = 0; i < (String(name).startsWith("el-train") ? 24 : 12); i++)
        await page.mouse.wheel(0, 100);
    },
  })),
  { name: "city-sunset", query: "room=city&view=full&time=19:30" },
  {
    name: "city-night",
    query: "room=city&view=full&time=23:00",
    act: furnitureReady,
  },
  // seasonal dressing (src/client/city/SeasonalDressing.tsx), previewed with ?date=
  ...[
    // fairy lights along Nightlife Row's south facades
    [
      "season-winter",
      "2026-12-20",
      "21:00",
      "high",
      "100,10",
      "100,2.2,4,128,4,14",
    ],
    // the Plaza tree
    [
      "season-winter-tree",
      "2026-12-20",
      "21:00",
      "high",
      "24,36",
      "28,2.5,44,12,4,29",
    ],
    // jack-o'-lanterns and bats at the Pulse door, seen along the facade
    [
      "season-halloween",
      "2026-10-28",
      "19:30",
      "high",
      "118,10",
      "126,1.8,11.5,110,2.4,13.4",
    ],
    // lanterns over Chinatown's avenue, from above the traffic
    [
      "season-lunar",
      "2027-02-10",
      "20:00",
      "high",
      "226,4",
      "214,6,-1,262,5,0",
    ],
    // the same winter and Halloween views on the low tier, for the budget
    [
      "season-winter-low",
      "2026-12-20",
      "21:00",
      "low",
      "100,10",
      "100,2.2,4,128,4,14",
    ],
    [
      "season-halloween-low",
      "2026-10-28",
      "19:30",
      "low",
      "118,10",
      "126,1.8,11.5,110,2.4,13.4",
    ],
  ].map(([name, date, time, quality, at, cam]) => ({
    name: String(name),
    query: `room=city&quality=${quality}&date=${date}&time=${time}&at=${at}&cam=${cam}`,
    act: furnitureReady,
  })),
  // the string lights over Nightlife Row's avenue (garland in dressing.ts)
  {
    name: "cubes-strings",
    query: "room=city&quality=high&time=21:00&at=100,8&cam=100,2.2,8,150,7,-2",
    act: furnitureReady,
  },
  // the queue outside Pulse, Kenney people on the forecourt (QueueCrowd.tsx)
  {
    name: "crowd-queue",
    query: "room=city&quality=high&time=21:00&at=112,6&cam=96,2.4,4,113,1.6,17",
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
    act: cityReady,
  },
  {
    // the park's entrance from Park Avenue, flanked by trees
    name: "city-park-entrance",
    query: "room=city&view=full&time=14:00&at=254,-262",
    act: cityReady,
  },
  {
    // the dog yard east of the park's north-south path (src/game/city/dogPark.ts)
    name: "dog-park",
    query:
      "room=city&view=room&time=14:00&at=264,-292&cam=276,7,-292,264,0.5,-304",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.dogs !== undefined,
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the weekend farmers market (src/game/city/farmersMarket.ts), forced open
    name: "farmers-market",
    query:
      "room=city&view=room&time=11:00&market=1&at=252,-290&cam=253,6.5,-290,244,1.2,-302",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.market === "open",
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    // the same stalls on a weekday: closed, bare and unmanned
    name: "farmers-market-closed",
    query:
      "room=city&view=room&time=11:00&market=0&at=252,-290&cam=253,6.5,-290,244,1.2,-302",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.market === "closed",
    // the park band on its shell's stage mid-tune (src/game/city/bandShell.ts)
    name: "band-shell",
    query:
      "room=city&view=room&time=11:00&band=40&at=230,-290&cam=232,4.5,-291,230,2.2,-272",
    act: async (page) => {
      await cityReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.band === "playing",
        null,
        { timeout: 300_000 },
      );
    },
  },
  {
    name: "city-park-pond",
    query: "room=city&view=full&time=14:00&at=233,-290",
    act: furnitureReady,
  },
  {
    // Beachside's boardwalk (src/game/city/boardwalk.ts)
    name: "city-boardwalk",
    query: "room=city&view=full&time=15:00&at=-34,286",
    act: furnitureReady,
  },
  {
    // a deck bench from the front quarter: bleached planks, facing the sea
    name: "bench-boardwalk",
    query:
      "room=city&view=room&time=15:00&at=-380,276&cam=-391,1.4,289.4,-394.5,0.7,288.7",
    act: furnitureReady,
  },
  {
    // a park bench from the front quarter: green slats on iron, facing the path
    name: "bench-park",
    query:
      "room=city&view=room&time=14:00&at=235,-282&cam=225,1.9,-291.2,222,0.6,-285.8",
    act: furnitureReady,
  },
  {
    // the boardwalk's fairground end: carousel and Ferris wheel
    name: "city-boardwalk-fair",
    query: "room=city&view=room&time=15:00&at=320,292&cam=290,3,289,338,12,301",
    act: furnitureReady,
  },
  ...[
    // Palm Court: the lane one block back from the boardwalk, with the motels
    // along its north side (the camera is pinned with ?cam=)
    ["beachside-motels", "-212,10,214,-130,6,194"],
    ["beachside-motels-east", "-60,9,214,40,6,194"],
    ["beachside-motels-far", "-60,30,260,-60,4,190"],
    ["beachside-motel-close", "-168,5,217,-184,3.5,194"],
    ["beachside-motel-wide", "-120,12,236,-165,4,196"],
  ].map(([name, cam]) => ({
    name: String(name),
    query: cam
      ? `room=city&view=room&time=15:00&at=-110,213&cam=${cam}`
      : "room=city&time=15:00&at=-182,214",
    live: true,
    act: async (page: Page) => {
      await page.locator("canvas").waitFor();
      await blocksReady(page);
      await page.waitForFunction(
        () => document.querySelector("canvas")?.dataset.frames === "10",
        null,
        { timeout: 300_000 },
      );
    },
  })),
  {
    // sunbathers' umbrellas, a lifeguard stand and the dune fence
    name: "city-beach",
    query: "room=city&view=full&time=15:00&at=-135,317",
    act: furnitureReady,
  },
  {
    // along the boardwalk, looking east: shops on the left, beach and sea on
    // the right, the Ferris wheel ahead (the camera is pinned with ?cam=)
    name: "city-boardwalk-wide",
    query:
      "room=city&view=room&time=15:00&at=250,284&cam=160,2.8,282,340,3,296",
    act: furnitureReady,
  },
  {
    // eye level on the deck: the crowd, the kiosks and carts, the cyclists
    name: "city-boardwalk-crowd",
    query:
      "room=city&view=room&time=15:00&at=40,283&cam=-10,2.2,284,90,1.8,283.5",
    act: furnitureReady,
  },
  {
    // a parade float up close (the parade is under way when the HUD says so)
    name: "city-parade-float",
    query:
      "room=city&view=room&time=15:00&parade=60&at=-40,283&cam=-62,2.6,288,-10,2.2,283",
    act: furnitureReady,
  },
  {
    // straight down on the planks: the boards run north-south, across the walk
    name: "city-deck-top",
    query: "room=city&time=15:00&at=-34,286&cam=-34,14,283,-34,0,283.5",
    act: furnitureReady,
  },
  {
    name: "city-boardwalk-dusk",
    query:
      "room=city&view=room&time=19:40&at=250,284&cam=160,2.8,282,340,3,296",
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
  { name: "farm", query: "room=farm" },
  { name: "garden", query: "room=garden" },
  // close on the north pasture's fence rails and the plots
  { name: "farm-fence", query: "room=farm&cam=12,3.5,-1,12,0.6,-12" },
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
  await page.goto(`${BASE}/?quality=low${still}&${shot.query}`, {
    timeout: 300_000,
  });
  if (shot.act) await shot.act(page);
  const canvas = page.getByRole("img", { name: "3D room view" });
  await expect(canvas).toHaveAttribute("data-frames", /\d+/, {
    timeout: 600_000,
  });
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
  const calls = await canvas.getAttribute("data-calls");
  const triangles = await canvas.getAttribute("data-triangles");
  console.log(
    `${shot.name}: ${last} frames, ${calls} draw calls, ${triangles} triangles, ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
  await page.close();
}
await browser.close();
