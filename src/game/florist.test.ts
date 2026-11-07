// Bouquet validation, pricing and color harmony.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bouquetPrice, harmonyScore, validateBouquet } from "./florist.ts";

const bouquet = {
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
