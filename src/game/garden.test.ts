// Tests for community garden logic: plot claiming, seeds, growth stages,
// watering, wilting, recovery, harvesting, produce storage, and save cleaning.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BLOCKERS,
  BOUNDS,
  GARDEN_FENCE_SPOTS,
  GARDEN_PATHS,
  GATE_HALF,
  NEIGHBOR_BEDS,
  SPAWN,
  GARDEN_CROPS,
  GARDEN_CROP_IDS,
  GARDEN_PLOT_COUNT,
  SOIL_DRY_MS,
  WILTING_THRESHOLD_MS,
  claimPlot,
  cleanGarden,
  createDefaultGarden,
  fastForwardGarden,
  harvestPlot,
  isGardenCropId,
  plantSeed,
  plotGrowth,
  waterPlot,
} from "./garden.ts";

test("creates a fresh community garden with plot 0 claimed and 7 unclaimed plots", () => {
  const garden = createDefaultGarden();
  assert.equal(garden.plots.length, GARDEN_PLOT_COUNT);
  assert.equal(garden.plots[0].claimed, true);
  assert.equal(garden.plots[0].crop, null);
  for (let i = 1; i < GARDEN_PLOT_COUNT; i++) {
    assert.equal(garden.plots[i].claimed, false);
    assert.equal(garden.plots[i].crop, null);
  }
  assert.deepEqual(garden.produce, {
    tomato: 0,
    strawberry: 0,
    sunflower: 0,
    pepper: 0,
    herb: 0,
  });
});

test("isGardenCropId recognizes all 5 community garden crops", () => {
  for (const id of GARDEN_CROP_IDS) {
    assert.equal(isGardenCropId(id), true);
  }
  assert.equal(isGardenCropId("invalid"), false);
  assert.equal(isGardenCropId(123), false);
  assert.equal(isGardenCropId(null), false);
});

test("claimPlot claims an unclaimed plot and rejects already claimed plots", () => {
  const garden = createDefaultGarden();
  const claimed = claimPlot(garden, 1);
  assert.ok(claimed);
  assert.equal(claimed.plots[1].claimed, true);

  // claiming again fails
  assert.equal(claimPlot(claimed, 1), null);
  // out of bounds fails
  assert.equal(claimPlot(garden, -1), null);
  assert.equal(claimPlot(garden, 99), null);
});

test("plantSeed plants a seed on a claimed empty plot and deducts cost", () => {
  const garden = createDefaultGarden();
  const now = 1_000_000;
  const planted = plantSeed(garden, 0, "tomato", now);
  assert.ok(planted);
  assert.equal(planted.cost, GARDEN_CROPS.tomato.seedPrice);
  assert.equal(planted.garden.plots[0].crop, "tomato");
  assert.equal(planted.garden.plots[0].plantedAt, now);
  assert.equal(planted.garden.plots[0].wateredAt, null);
  assert.equal(planted.garden.plots[0].growthMs, 0);

  // cannot plant on unclaimed plot
  assert.equal(plantSeed(garden, 1, "tomato", now), null);
  // cannot plant on an already occupied plot
  assert.equal(plantSeed(planted.garden, 0, "strawberry", now), null);
});

test("plotGrowth returns stage 0 for unwatered seeds", () => {
  const garden = createDefaultGarden();
  const now = 1_000_000;
  const planted = plantSeed(garden, 0, "herb", now)!;

  const growth = plotGrowth(planted.garden.plots[0], now + 5000);
  assert.equal(growth.stage, 0);
  assert.equal(growth.progress, 0);
  assert.equal(growth.ready, false);
  assert.equal(growth.wilted, false);
});

test("waterPlot waters an unwatered plot and enables growth", () => {
  const garden = createDefaultGarden();
  const t0 = 1_000_000;
  const planted = plantSeed(garden, 0, "strawberry", t0)!;
  const watered = waterPlot(planted.garden, 0, t0);
  assert.ok(watered);
  assert.equal(watered.plots[0].wateredAt, t0);

  // after half duration, progress is around 0.5 and stage 2
  const duration = GARDEN_CROPS.strawberry.growthDurationMs;
  const half = t0 + duration * 0.5;
  const growthHalf = plotGrowth(watered.plots[0], half);
  assert.equal(growthHalf.stage, 2);
  assert.ok(growthHalf.progress >= 0.49 && growthHalf.progress <= 0.51);
  assert.equal(growthHalf.ready, false);
  assert.equal(growthHalf.wilted, false);

  // at full duration, stage 4 and ready to harvest
  const full = t0 + duration;
  const growthFull = plotGrowth(watered.plots[0], full);
  assert.equal(growthFull.stage, 4);
  assert.equal(growthFull.ready, true);
  assert.equal(growthFull.progress, 1);
});

test("plants left dry too long wilt, but recover when watered", () => {
  const garden = createDefaultGarden();
  const t0 = 1_000_000;
  const planted = plantSeed(garden, 0, "pepper", t0)!;
  const watered = waterPlot(planted.garden, 0, t0)!;

  // Let soil dry out and exceed wilting threshold
  const tWilt = t0 + SOIL_DRY_MS + WILTING_THRESHOLD_MS + 1000;
  const growthWilted = plotGrowth(watered.plots[0], tWilt);
  assert.equal(growthWilted.wilted, true);
  assert.equal(growthWilted.dry, true);

  // Watering the wilted plant recovers it
  const tRecover = tWilt + 5000;
  const rewatered = waterPlot(watered, 0, tRecover);
  assert.ok(rewatered);

  const growthRecovered = plotGrowth(rewatered.plots[0], tRecover + 100);
  assert.equal(growthRecovered.wilted, false);
  assert.equal(growthRecovered.dry, false);
});

test("harvestPlot yields produce, rewards coins, and clears soil", () => {
  const garden = createDefaultGarden();
  const t0 = 1_000_000;
  const planted = plantSeed(garden, 0, "sunflower", t0)!;
  const watered = waterPlot(planted.garden, 0, t0)!;

  const duration = GARDEN_CROPS.sunflower.growthDurationMs;
  const tReady = t0 + duration + 100;

  // Cannot harvest before ready
  assert.equal(harvestPlot(watered, 0, t0 + 100), null);

  const harvested = harvestPlot(watered, 0, tReady, () => 0.5);
  assert.ok(harvested);
  assert.equal(harvested.crop, "sunflower");
  assert.ok(harvested.yieldCount >= GARDEN_CROPS.sunflower.yieldMin);
  assert.ok(harvested.coins > 0);
  assert.equal(harvested.garden.produce.sunflower, harvested.yieldCount);

  // Plot is empty, cleared, but still claimed
  const plotAfter = harvested.garden.plots[0];
  assert.equal(plotAfter.claimed, true);
  assert.equal(plotAfter.crop, null);
  assert.equal(plotAfter.plantedAt, 0);
  assert.equal(plotAfter.wateredAt, null);
  assert.equal(plotAfter.growthMs, 0);
});

test("cleanGarden validates and salvages corrupted save data", () => {
  const fallback = createDefaultGarden();

  assert.deepEqual(cleanGarden(null), fallback);
  assert.deepEqual(cleanGarden("invalid"), fallback);

  const corrupted = {
    plots: [
      {
        claimed: true,
        crop: "tomato",
        plantedAt: 1234,
        wateredAt: 5678,
        growthMs: 100,
      },
      {
        claimed: "yes",
        crop: "banana",
        plantedAt: -10,
        wateredAt: "now",
        growthMs: -5,
      },
      null,
    ],
    produce: {
      tomato: 5,
      strawberry: -2,
      invalidCrop: 99,
      pepper: 3.8,
    },
  };

  const cleaned = cleanGarden(corrupted);
  assert.equal(cleaned.plots.length, GARDEN_PLOT_COUNT);
  assert.equal(cleaned.plots[0].claimed, true);
  assert.equal(cleaned.plots[0].crop, "tomato");
  assert.equal(cleaned.plots[0].plantedAt, 1234);
  assert.equal(cleaned.plots[0].wateredAt, 5678);
  assert.equal(cleaned.plots[0].growthMs, 100);

  // Plot 1 invalid fields sanitized
  assert.equal(cleaned.plots[1].claimed, false);
  assert.equal(cleaned.plots[1].crop, null);
  assert.equal(cleaned.plots[1].plantedAt, 0);
  assert.equal(cleaned.plots[1].wateredAt, null);
  assert.equal(cleaned.plots[1].growthMs, 0);

  // Produce clamped and sanitized
  assert.equal(cleaned.produce.tomato, 5);
  assert.equal(cleaned.produce.strawberry, 0);
  assert.equal(cleaned.produce.pepper, 3);
  assert.equal(cleaned.produce.herb, 0);
});

test("fastForwardGarden advances planted crop growth timestamps", () => {
  const garden = createDefaultGarden();
  const now = 1_000_000;
  const planted = plantSeed(garden, 0, "herb", now)!;
  const watered = waterPlot(planted.garden, 0, now)!;
  const before = plotGrowth(watered.plots[0], now);
  assert.equal(before.stage, 0);
  assert.equal(before.ready, false);

  const advanced = fastForwardGarden(watered, 65_000);
  const after = plotGrowth(advanced.plots[0], now);
  assert.equal(after.stage, 4);
  assert.equal(after.ready, true);
});

test("the picket fence closes the lot except for the gate gap", () => {
  const south = GARDEN_FENCE_SPOTS.filter(
    (f) => Math.abs(f.z - BOUNDS.z1) < 0.01,
  );
  assert.ok(south.length >= 2);
  for (const f of south) assert.ok(Math.abs(f.x) > GATE_HALF);
  // each side's panels are stretched to meet end to end: no panel is more than a third off its model length
  for (const f of GARDEN_FENCE_SPOTS) assert.ok(f.sx > 0.67 && f.sx < 1.34);
  // every panel stays inside the lot
  for (const f of GARDEN_FENCE_SPOTS) {
    assert.ok(f.x >= BOUNDS.x0 && f.x <= BOUNDS.x1);
    assert.ok(f.z >= BOUNDS.z0 && f.z <= BOUNDS.z1);
  }
});

test("neighbors grow crops in every bed but the first, at valid stages", () => {
  assert.deepEqual(
    NEIGHBOR_BEDS.map((n) => n.bed),
    [1, 2, 3, 4, 5, 6, 7],
  );
  for (const n of NEIGHBOR_BEDS) {
    assert.ok(isGardenCropId(n.crop));
    assert.ok(n.stage >= 1 && n.stage <= 4);
  }
});

test("paths and walkable dressing leave the gate and beds reachable", () => {
  for (const p of GARDEN_PATHS) {
    assert.ok(p.x0 < p.x1 && p.z0 < p.z1);
    assert.ok(p.x0 >= BOUNDS.x0 && p.x1 <= BOUNDS.x1);
    assert.ok(p.z0 >= BOUNDS.z0 && p.z1 <= BOUNDS.z1);
  }
  // the spawn at the gate stands on the main path
  const main = GARDEN_PATHS[0];
  assert.ok(SPAWN[0] >= main.x0 && SPAWN[0] <= main.x1);
  // no blocker covers the spawn
  for (const b of BLOCKERS) {
    const xs = b.map((v) => v[0]);
    const zs = b.map((v) => v[1]);
    const inside =
      SPAWN[0] > Math.min(...xs) &&
      SPAWN[0] < Math.max(...xs) &&
      SPAWN[1] > Math.min(...zs) &&
      SPAWN[1] < Math.max(...zs);
    assert.equal(inside, false);
  }
});
