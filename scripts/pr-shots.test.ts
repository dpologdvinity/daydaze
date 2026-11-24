// Tests for choosing which screenshot shots a pull request attaches.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { UI_ALLOWLIST, knownShots, pickShots } from "./pr-shots.ts";

const KNOWN = ["aquarium", "club-pulse", "city-day", "plaza", "hud-city"];

test("a room folder maps to its shot, by name or by alias", () => {
  assert.deepEqual(pickShots(["src/client/rooms/aquarium/Tank.tsx"], KNOWN), [
    "aquarium",
  ]);
  assert.deepEqual(pickShots(["src/client/rooms/pulse/Floor.tsx"], KNOWN), [
    "club-pulse",
  ]);
});

test("city, avatar and UI code each map to one representative shot", () => {
  assert.deepEqual(
    pickShots(
      [
        "src/game/city/layout.ts",
        "src/client/avatar/Doll.tsx",
        "src/client/ui/Hud.tsx",
      ],
      KNOWN,
    ),
    ["city-day", "plaza", "hud-city"],
  );
});

test("shots are deduplicated, must exist, and are capped at six", () => {
  assert.deepEqual(
    pickShots(
      [
        "src/client/city/a.ts",
        "src/client/city/b.ts",
        "src/client/rooms/nope/x.ts",
      ],
      KNOWN,
    ),
    ["city-day"],
  );
  const many = Array.from({ length: 9 }, (_, i) => `s${i}`);
  const files = many.map((s) => `src/client/rooms/${s}/x.ts`);
  assert.equal(pickShots(files, many).length, 6);
});

test("docs and unmapped code attach nothing", () => {
  assert.deepEqual(pickShots(["README.md", "src/net/x.ts"], KNOWN), []);
});

test("knownShots reads literal shot names and ignores other name: strings", () => {
  const src = `{ name: "plaza", query: "" }, getByRole("img", { name: "3D room view" })`;
  assert.deepEqual(knownShots(src), ["plaza"]);
});

test("knownShots reads helper-defined and mapped shot names", () => {
  const sample = `
    actionStrip("acid-peak", "query", () => {}, () => {}),
    lineupShot("together-kiss", "emote=kiss", "together"),
    petShot("pet-city", "room=city", "husky", "Biscuit"),
    homeShot("apartment-furnished", []),
    walkStrip("walk-feminine-short", "feminine", "click"),
    firefightStrip("firefight-laser", "room=laser-tag", "Suit up"),
    seatStrip("seat-bench-sit", "dome-bench-0", "sit", -1),
    wheelSheet("car-wheels"),
    jeepneyRoll("jeepney-wheels"),
    trafficClose("car-traffic-close-night", 23),
    ...(
      [
        ["dance-headspin", "Breaking", "Head spin"],
        ["dance-uprock", "Breaking", "Uprock"],
      ] as const
    ).map(([name, style, move]) => actionStrip(name, "query", () => {}, () => {})),
    ...(["Whisper", "Laughing"] as const).map((emote) =>
      actionStrip(\`emote-\${emote === "Whisper" ? "whisper" : "laugh"}\`, "query", () => {}, () => {}),
    ),
  `;
  const shots = knownShots(sample);
  assert.ok(shots.includes("acid-peak"));
  assert.ok(shots.includes("together-kiss"));
  assert.ok(shots.includes("pet-city"));
  assert.ok(shots.includes("apartment-furnished"));
  assert.ok(shots.includes("walk-feminine-short"));
  assert.ok(shots.includes("firefight-laser"));
  assert.ok(shots.includes("seat-bench-sit"));
  assert.ok(shots.includes("car-wheels"));
  assert.ok(shots.includes("jeepney-wheels"));
  assert.ok(shots.includes("car-traffic-close-night"));
  assert.ok(shots.includes("dance-headspin"));
  assert.ok(shots.includes("dance-uprock"));
  assert.ok(shots.includes("emote-whisper"));
  assert.ok(shots.includes("emote-laugh"));
});

test("knownShots extracts helper-defined shots from scripts/screenshots.ts", () => {
  const src = readFileSync("scripts/screenshots.ts", "utf8");
  const shots = knownShots(src);
  assert.ok(shots.includes("dance-headspin"));
  assert.ok(shots.includes("apartment-furnished"));
  assert.ok(shots.includes("pet-city"));
  assert.ok(shots.includes("together-kiss"));
  assert.ok(shots.includes("car-wheels"));
  assert.ok(shots.includes("acid-peak"));
  assert.ok(shots.length > 290);
});

test("the shared order panel and the shift rules map to the pay-slip shot", () => {
  const known = [...KNOWN, "barista-pay-slip"];
  for (const file of [
    "src/client/rooms/shared/OrderPanel.tsx",
    "src/client/rooms/shared/orderSession.ts",
    "src/game/shifts.ts",
  ])
    assert.deepEqual(pickShots([file], known), ["barista-pay-slip"], file);
});

test("the closet's wardrobe code maps to the closet shot", () => {
  assert.deepEqual(
    pickShots(
      ["src/client/ui/WardrobePicker.tsx", "src/game/wardrobe.ts"],
      [...KNOWN, "closet-wardrobe"],
    ),
    ["closet-wardrobe"],
  );
});

test("the hunger and thirst HUD maps to its own shot", () => {
  assert.deepEqual(
    pickShots(["src/game/food/needs.ts"], [...KNOWN, "hungry-hud"]),
    ["hungry-hud"],
  );
});

test("the weekly boards panel shows its own shot, not the generic HUD one", () => {
  assert.deepEqual(
    pickShots(["src/client/ui/WeeklyBoards.tsx"], [...KNOWN, "weekly-board"]),
    ["weekly-board"],
  );
});

test("Progression maps to menu-ladders and rank-up", () => {
  const known = [...KNOWN, "menu-ladders", "rank-up"];
  assert.deepEqual(pickShots(["src/client/ui/Progression.tsx"], known), [
    "menu-ladders",
    "rank-up",
  ]);
  assert.deepEqual(pickShots(["src/game/progression/activities.ts"], known), [
    "menu-ladders",
    "rank-up",
  ]);
});

test("PrizeCard and prizeDesk map to prize-card", () => {
  const known = [...KNOWN, "prize-card"];
  assert.deepEqual(pickShots(["src/client/ui/PrizeCard.tsx"], known), [
    "prize-card",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/prizeDesk.ts"], known), [
    "prize-card",
  ]);
  assert.deepEqual(pickShots(["src/game/prizes.ts"], known), ["prize-card"]);
});

test("GameMenu maps to menu-ladders and city-menu", () => {
  const known = [...KNOWN, "menu-ladders", "city-menu"];
  assert.deepEqual(pickShots(["src/client/ui/GameMenu.tsx"], known), [
    "menu-ladders",
    "city-menu",
  ]);
});

test("ShopPanel and shopRequest map to shop-panel", () => {
  const known = [...KNOWN, "shop-panel"];
  assert.deepEqual(pickShots(["src/client/ui/ShopPanel.tsx"], known), [
    "shop-panel",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/shopRequest.ts"], known), [
    "shop-panel",
  ]);
  assert.deepEqual(pickShots(["src/game/shop.ts"], known), ["shop-panel"]);
});

test("on-demand UI panels map to their respective shots", () => {
  const known = [
    ...KNOWN,
    "city-map",
    "event-calendar",
    "collections",
    "graphics-menu",
    "streak-panel",
    "closet-mirror",
    "plate-rush-app",
    "credits",
    "friends-panel",
    "card-table",
    "shoplift-panel",
  ];
  assert.deepEqual(pickShots(["src/client/ui/CityMap.tsx"], known), [
    "city-map",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/cityMapRequest.ts"], known), [
    "city-map",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/EventCalendar.tsx"], known), [
    "event-calendar",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/Collections.tsx"], known), [
    "collections",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/GraphicsPanel.tsx"], known), [
    "graphics-menu",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/StreakPanel.tsx"], known), [
    "streak-panel",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/MirrorPanel.tsx"], known), [
    "closet-mirror",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/phone/DeliveryApp.tsx"], known), [
    "plate-rush-app",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/CreditsPanel.tsx"], known), [
    "credits",
  ]);
  assert.deepEqual(pickShots(["src/client/net/FriendsPanel.tsx"], known), [
    "friends-panel",
  ]);
  assert.deepEqual(pickShots(["src/client/net/AccountPanel.tsx"], known), [
    "friends-panel",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/CardTable.tsx"], known), [
    "card-table",
  ]);
  assert.deepEqual(pickShots(["src/client/ui/ShopliftPanel.tsx"], known), [
    "shoplift-panel",
  ]);
});

test("every component under src/client/ui/ has a mapped shot or is explicitly allowlisted", () => {
  const allKnown = knownShots(readFileSync("scripts/screenshots.ts", "utf8"));

  function findTsxFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...findTsxFiles(full));
      else if (entry.name.endsWith(".tsx")) files.push(full);
    }
    return files;
  }

  const componentFiles = findTsxFiles("src/client/ui");
  assert.ok(componentFiles.length > 0);

  for (const file of componentFiles) {
    const base = file.split("/").pop() ?? "";
    if (UI_ALLOWLIST.has(base)) continue;
    const shots = pickShots([file], allKnown);
    const nonFallback = shots.filter((s) => s !== "hud-city");
    assert.ok(
      nonFallback.length > 0,
      `${file} has no mapped shot and is not in UI_ALLOWLIST`,
    );
  }
});
