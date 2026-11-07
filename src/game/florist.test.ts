// Bouquet validation, pricing and color harmony.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addStem,
  arrange,
  bouquetPrice,
  buyBouquet,
  emptyBouquet,
  harmonyLabel,
  harmonyScore,
  MAX_STEMS,
  removeLastStem,
  type Bouquet,
  type Stem,
  validateBouquet,
} from "./florist.ts";

const bouquet: Bouquet = {
  stems: ["rose", "tulip", "daisy"],
  wrap: "kraft",
  ribbon: "pink",
};

test("bouquets require three to twelve known stems and known finishing choices", () => {
  assert.equal(validateBouquet(bouquet), true);
  for (const value of [
    null,
    {},
    { ...bouquet, stems: ["rose", "tulip"] },
    { ...bouquet, stems: Array(13).fill("rose") },
    { ...bouquet, stems: Array(3) },
    { ...bouquet, stems: ["rose", "tulip", "weed"] },
    { ...bouquet, wrap: "unknown" },
    { ...bouquet, ribbon: 42 },
  ]) {
    assert.equal(validateBouquet(value), false);
  }
  assert.equal(
    validateBouquet({ ...bouquet, stems: Array(12).fill("rose") }),
    true,
  );
});

test("price counts each stem and harmony rewards a considered mix", () => {
  if (!validateBouquet(bouquet)) throw new Error("invalid fixture");
  assert.equal(bouquetPrice(bouquet), 18);
  assert.ok(
    harmonyScore(bouquet) >
      harmonyScore({ ...bouquet, stems: ["rose", "rose", "rose"] }),
  );
});

test("saved bouquets survive reload while malformed bouquets are discarded", async () => {
  const { createDefaultSave, loadSave, serializeSave } =
    await import("./save.ts");
  const save = createDefaultSave("Taylor");
  assert.equal(save.bouquet, null);
  if (!validateBouquet(bouquet)) throw new Error("invalid fixture");
  save.bouquet = bouquet;
  assert.deepEqual(loadSave(serializeSave(save), "Guest").bouquet, bouquet);
  const broken = { ...save, bouquet: { ...bouquet, stems: ["rose"] } };
  assert.equal(loadSave(JSON.stringify(broken), "Guest").bouquet, null);
});

test("building adds stems up to the cap and never mutates the old bouquet", () => {
  const empty = emptyBouquet();
  const one = addStem(empty, "rose");
  assert.deepEqual(empty.stems, []);
  assert.deepEqual(one.stems, ["rose"]);
  let full = empty;
  for (let i = 0; i < MAX_STEMS + 3; i++) full = addStem(full, "daisy");
  assert.equal(full.stems.length, MAX_STEMS);
  assert.deepEqual(removeLastStem(one).stems, []);
  assert.deepEqual(removeLastStem(empty).stems, []);
});

test("buying needs a complete bouquet and enough coins", () => {
  assert.equal(buyBouquet(100, emptyBouquet()), null);
  assert.equal(buyBouquet(100, bouquet), 82);
  assert.equal(buyBouquet(17, bouquet), null);
  assert.equal(buyBouquet(18, bouquet), 0);
});

test("the harmony label climbs with variety", () => {
  const stems = (list: Stem[]): Bouquet => ({ ...bouquet, stems: list });
  assert.equal(harmonyLabel(emptyBouquet()), "Just getting started");
  assert.equal(
    harmonyLabel(stems(["rose", "rose", "rose"])),
    "Just getting started",
  );
  assert.equal(harmonyLabel(stems(bouquet.stems)), "Sweet and simple");
  assert.equal(
    harmonyLabel(stems(["rose", "sunflower", "lily", "eucalyptus", "peony"])),
    "A showstopper",
  );
});

test("arranging fans stems out in a dome without repeats", () => {
  const poses = arrange(MAX_STEMS);
  assert.equal(poses.length, MAX_STEMS);
  assert.deepEqual(poses[0], { tiltX: 0, tiltZ: -0, lift: -0 });
  const seen = new Set(
    poses.map((p) => `${p.tiltX.toFixed(3)},${p.tiltZ.toFixed(3)}`),
  );
  assert.equal(seen.size, MAX_STEMS);
  for (const p of poses) assert.ok(Math.hypot(p.tiltX, p.tiltZ) < 1);
  assert.deepEqual(arrange(0), []);
  assert.deepEqual(arrange(4), arrange(5).slice(0, 4));
});
