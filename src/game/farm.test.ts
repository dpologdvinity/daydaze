// Sunny Acres Farm: crop growth, watering, harvest yields, produce sales and animal feeding.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanFarm,
  createDefaultFarm,
  CROPS,
  FARM_ANIMALS,
  FARM_SPECIES,
  fastForwardFarm,
  feedAnimal,
  harvestPlot,
  plantSeed,
  plotGrowth,
  sellProduce,
  waterPlot,
  type CropId,
} from "./farm.ts";

test("crop catalog contains valid definitions for carrot, tomato, corn and wheat", () => {
  const ids: CropId[] = ["carrot", "tomato", "corn", "wheat"];
  for (const id of ids) {
    const crop = CROPS[id];
    assert.ok(crop, `missing crop: ${id}`);
    assert.ok(crop.name);
    assert.ok(crop.seedPrice > 0, `${id} seed price must be positive`);
    assert.ok(
      crop.sellPrice > crop.seedPrice,
      `${id} sell price must exceed seed price`,
    );
    assert.ok(
      crop.growthDurationMs > 0,
      `${id} growth duration must be positive`,
    );
    assert.ok(crop.yieldMin >= 1);
    assert.ok(crop.yieldMax >= crop.yieldMin);
  }
});

test("a default farm has six empty plots and an empty grocery basket", () => {
  const farm = createDefaultFarm();
  assert.equal(farm.plots.length, 6);
  for (const plot of farm.plots) {
    assert.equal(plot.crop, null);
    assert.equal(plot.plantedAt, 0);
    assert.equal(plot.wateredAt, null);
  }
  assert.deepEqual(farm.groceries, {
    carrot: 0,
    tomato: 0,
    corn: 0,
    wheat: 0,
  });
});

test("planting a seed sets the crop and timestamp", () => {
  const farm = createDefaultFarm();
  const now = 1000000;
  const res = plantSeed(farm, 0, "carrot", now);
  assert.ok(res);
  assert.equal(res.cost, CROPS.carrot.seedPrice);
  assert.equal(res.farm.plots[0].crop, "carrot");
  assert.equal(res.farm.plots[0].plantedAt, now);
  assert.equal(res.farm.plots[0].wateredAt, null);

  // planting on an already occupied plot is rejected
  assert.equal(plantSeed(res.farm, 0, "tomato", now), null);
  // invalid plot index is rejected
  assert.equal(plantSeed(res.farm, 99, "carrot", now), null);
  assert.equal(plantSeed(res.farm, -1, "carrot", now), null);
});

test("watering an unwatered planted plot starts its growth", () => {
  const farm = createDefaultFarm();
  const t0 = 1000000;
  const planted = plantSeed(farm, 1, "tomato", t0)!.farm;

  // Cannot water an empty plot
  assert.equal(waterPlot(planted, 0, t0), null);

  const t1 = t0 + 5000;
  const watered = waterPlot(planted, 1, t1);
  assert.ok(watered);
  assert.equal(watered.plots[1].wateredAt, t1);

  // Watering already watered plot does not reset growth timer
  const t2 = t1 + 10000;
  const rewatered = waterPlot(watered, 1, t2);
  assert.equal(rewatered, null);
});

test("growth stages progress over time once watered", () => {
  const farm = createDefaultFarm();
  const t0 = 1000000;
  const planted = plantSeed(farm, 2, "corn", t0)!.farm;
  const duration = CROPS.corn.growthDurationMs;

  // Unwatered: stage 0, progress 0, not ready
  const unwateredGrowth = plotGrowth(planted.plots[2], t0 + 50000);
  assert.equal(unwateredGrowth.stage, 0);
  assert.equal(unwateredGrowth.progress, 0);
  assert.equal(unwateredGrowth.ready, false);

  const watered = waterPlot(planted, 2, t0)!.plots[2];

  // Stage 1: early sprout (progress < 0.33)
  const g1 = plotGrowth(watered, t0 + duration * 0.15);
  assert.equal(g1.stage, 1);
  assert.equal(g1.ready, false);

  // Stage 2: growing stem/leaves (0.33 <= progress < 0.66)
  const g2 = plotGrowth(watered, t0 + duration * 0.5);
  assert.equal(g2.stage, 2);
  assert.equal(g2.ready, false);

  // Stage 3: flowering/budding (0.66 <= progress < 1.0)
  const g3 = plotGrowth(watered, t0 + duration * 0.85);
  assert.equal(g3.stage, 3);
  assert.equal(g3.ready, false);

  // Stage 4: fully ripe and ready (progress >= 1.0)
  const g4 = plotGrowth(watered, t0 + duration);
  assert.equal(g4.stage, 4);
  assert.equal(g4.progress, 1);
  assert.equal(g4.ready, true);
});

test("harvesting yields produce and clears the plot", () => {
  const farm = createDefaultFarm();
  const t0 = 1000000;
  const planted = plantSeed(farm, 0, "wheat", t0)!.farm;
  const watered = waterPlot(planted, 0, t0)!;
  const duration = CROPS.wheat.growthDurationMs;

  // Cannot harvest before ready
  assert.equal(harvestPlot(watered, 0, t0 + duration * 0.5), null);

  // Harvest when ready
  const harvested = harvestPlot(watered, 0, t0 + duration, () => 0.5);
  assert.ok(harvested);
  assert.equal(harvested.crop, "wheat");
  assert.ok(harvested.yieldCount >= CROPS.wheat.yieldMin);
  assert.ok(harvested.yieldCount <= CROPS.wheat.yieldMax);
  assert.equal(harvested.farm.plots[0].crop, null);
  assert.equal(harvested.farm.plots[0].plantedAt, 0);
  assert.equal(harvested.farm.plots[0].wateredAt, null);
  assert.equal(harvested.farm.groceries.wheat, harvested.yieldCount);
});

test("selling produce at the farm stand adds coins and deducts stock", () => {
  const farm = createDefaultFarm();
  farm.groceries.carrot = 5;

  // Cannot sell more than available
  assert.equal(sellProduce(farm, "carrot", 6), null);
  assert.equal(sellProduce(farm, "carrot", 0), null);
  assert.equal(sellProduce(farm, "tomato", 1), null);

  const sold = sellProduce(farm, "carrot", 3);
  assert.ok(sold);
  assert.equal(sold.coinsEarned, 3 * CROPS.carrot.sellPrice);
  assert.equal(sold.farm.groceries.carrot, 2);
});

test("fast-forward accelerates plot timers for testing", () => {
  const farm = createDefaultFarm();
  const t0 = 1000000;
  const planted = plantSeed(farm, 0, "carrot", t0)!.farm;
  const watered = waterPlot(planted, 0, t0)!;

  const duration = CROPS.carrot.growthDurationMs;
  const shifted = fastForwardFarm(watered, duration);
  const growth = plotGrowth(shifted.plots[0], t0);
  assert.equal(growth.ready, true);
  assert.equal(growth.stage, 4);
});

test("feeding farm animals records timestamp and triggers heart", () => {
  const farm = createDefaultFarm();
  const t0 = 1000000;
  const fed = feedAnimal(farm, "cow", t0);
  assert.ok(fed.heart);
  assert.equal(fed.farm.animalsFedAt.cow, t0);
});

test("cleanFarm validates and sanitizes corrupt or legacy stored data", () => {
  const fallback = createDefaultFarm();
  assert.deepEqual(cleanFarm(null), fallback);
  assert.deepEqual(cleanFarm("garbage"), fallback);
  assert.deepEqual(cleanFarm({}), fallback);

  const partial = {
    plots: [
      { crop: "carrot", plantedAt: 12345, wateredAt: 23456 },
      { crop: "unknown-fruit", plantedAt: 100, wateredAt: 200 },
      "corrupt",
    ],
    groceries: { carrot: 3, tomato: -5, invalid: 99 },
    animalsFedAt: { cow: 5555 },
  };

  const cleaned = cleanFarm(partial);
  assert.equal(cleaned.plots.length, 6);
  assert.equal(cleaned.plots[0].crop, "carrot");
  assert.equal(cleaned.plots[0].plantedAt, 12345);
  assert.equal(cleaned.plots[0].wateredAt, 23456);
  assert.equal(cleaned.plots[1].crop, null); // invalid crop was cleaned to null
  assert.equal(cleaned.plots[2].crop, null);
  assert.equal(cleaned.groceries.carrot, 3);
  assert.equal(cleaned.groceries.tomato, 0); // negative clamped to 0
  assert.equal(cleaned.animalsFedAt.cow, 5555);
});

test("every farm animal's pen is open ground, and each kind can be fed", () => {
  for (const a of FARM_ANIMALS) {
    assert.ok(a.pen.x1 > a.pen.x0 && a.pen.z1 > a.pen.z0);
    assert.ok(FARM_SPECIES.includes(a.kind));
  }
  assert.equal(new Set(FARM_SPECIES).size, FARM_SPECIES.length);
  for (const kind of ["cow", "pig", "sheep", "chicken"] as const)
    assert.ok(FARM_SPECIES.includes(kind));
});

test("cleanFarm salvages a damaged save without throwing", () => {
  const bad = cleanFarm({
    plots: [
      null,
      5,
      { crop: "dragon", plantedAt: -1 },
      { crop: "corn", plantedAt: 9, wateredAt: 12 },
    ],
    groceries: { carrot: -3, corn: 2.9, wheat: "lots" },
    animalsFedAt: { cow: 5, pig: "never" },
  });
  assert.equal(bad.plots.length, 6);
  assert.equal(bad.plots[2]?.crop, null);
  assert.deepEqual(bad.plots[3], { crop: "corn", plantedAt: 9, wateredAt: 12 });
  assert.equal(bad.groceries.carrot, 0);
  assert.equal(bad.groceries.corn, 2);
  assert.equal(bad.groceries.wheat, 0);
  assert.deepEqual(bad.animalsFedAt, { cow: 5 });
  assert.deepEqual(cleanFarm("nope"), createDefaultFarm());
});
