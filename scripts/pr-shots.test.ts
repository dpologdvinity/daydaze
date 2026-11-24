// Tests for choosing which screenshot shots a pull request attaches.
import assert from "node:assert/strict";
import { test } from "node:test";
import { knownShots, pickShots } from "./pr-shots.ts";

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

test("knownShots reads the shot names and ignores other name: strings", () => {
  const src = `{ name: "plaza", query: "" }, getByRole("img", { name: "3D room view" })`;
  assert.deepEqual(knownShots(src), ["plaza"]);
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
