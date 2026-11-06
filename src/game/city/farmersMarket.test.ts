import assert from "node:assert/strict";
import { test } from "node:test";
import { CROPS, createDefaultFarm, sellProduce, type CropId } from "../farm.ts";
import { pickLine, seededRng } from "../dialogue/pick.ts";
import { LINE_BANKS } from "../dialogue/index.ts";
import {
  LANE_X,
  MARKET_BLOCKERS,
  PRODUCE_SIZE,
  STALL_DEPTH,
  STALLS,
  buyProduce,
  marketFlag,
  marketOpen,
  marketPrice,
  stallNear,
} from "./farmersMarket.ts";
import { MARKET_GREEN, PATH_NS } from "./park.ts";
import type { Vec2 } from "../walk.ts";

test("the market opens on weekends from 8 to 4 on the player's clock", () => {
  // Date.getDay: 0 Sunday .. 6 Saturday
  assert.equal(marketOpen(6, 10), true);
  assert.equal(marketOpen(0, 8), true);
  assert.equal(marketOpen(0, 15.99), true);
  assert.equal(marketOpen(0, 16), false);
  assert.equal(marketOpen(6, 7.9), false);
  for (const day of [1, 2, 3, 4, 5]) assert.equal(marketOpen(day, 12), false);
});

test("?market= forces the market open or shut", () => {
  assert.equal(marketFlag("?market=1"), true);
  assert.equal(marketFlag("?debug=1&market=0"), false);
  assert.equal(marketFlag("?market=2"), null);
  assert.equal(marketFlag(""), null);
});

test("eight stalls stand in two rows on the green with a clear lane", () => {
  assert.equal(STALLS.length, 8);
  assert.equal(new Set(STALLS.map((s) => s.id)).size, 8);
  const inside = (poly: readonly Vec2[], x: number, z: number) =>
    x > poly[0][0] && x < poly[1][0] && z > poly[0][1] && z < poly[2][1];
  for (const poly of MARKET_BLOCKERS) {
    for (const [x, z] of poly) {
      assert.ok(x > MARKET_GREEN.x0 && x < MARKET_GREEN.x1, `x ${x}`);
      assert.ok(z > MARKET_GREEN.z0 && z < MARKET_GREEN.z1, `z ${z}`);
    }
    assert.ok(poly[1][0] < PATH_NS.x0, "clear of the path");
  }
  // you can walk the whole lane, and the green's ends
  for (let z = MARKET_GREEN.z0 + 0.5; z < MARKET_GREEN.z1; z += 0.5)
    assert.ok(
      !MARKET_BLOCKERS.some((b) => inside(b, LANE_X, z)),
      `lane at ${z}`,
    );
  // no two stalls overlap
  MARKET_BLOCKERS.forEach((a, i) =>
    MARKET_BLOCKERS.slice(i + 1).forEach((b) =>
      assert.ok(
        a[1][0] <= b[0][0] ||
          b[1][0] <= a[0][0] ||
          a[2][1] <= b[0][1] ||
          b[2][1] <= a[0][1],
        "two stalls overlap",
      ),
    ),
  );
});

test("every stall has a vendor, a display of known produce and one crop to sell or none", () => {
  const crops = STALLS.map((s) => s.sells).filter(
    (c): c is CropId => c !== null,
  );
  assert.deepEqual([...crops].sort(), Object.keys(CROPS).sort());
  for (const s of STALLS) {
    assert.ok(s.vendor.name.length > 1);
    assert.ok(s.display.length >= 3);
    for (const p of s.display) assert.ok(p in PRODUCE_SIZE, p);
  }
});

test("a stall is found from the lane, not from behind it", () => {
  const west = STALLS[0];
  assert.equal(
    stallNear([west.at[0] + STALL_DEPTH / 2 + 0.4, west.at[1]])?.id,
    west.id,
  );
  const east = STALLS[4];
  assert.equal(
    stallNear([east.at[0] - STALL_DEPTH / 2 - 0.4, east.at[1]])?.id,
    east.id,
  );
  assert.equal(stallNear([MARKET_GREEN.x0 - 5, west.at[1]]), null);
  assert.equal(stallNear([LANE_X, MARKET_GREEN.z1 + 10]), null);
});

test("buying takes coins and adds a bunch to the farm's groceries", () => {
  const farm = createDefaultFarm();
  const bought = buyProduce(farm, 100, "tomato");
  assert.ok(bought);
  assert.equal(bought.coins, 100 - marketPrice("tomato"));
  assert.equal(bought.farm.groceries.tomato, 1);
  assert.equal(farm.groceries.tomato, 0, "the old save is untouched");
  assert.equal(buyProduce(farm, marketPrice("corn") - 1, "corn"), null);
});

test("the market never pays: a bunch costs more than the farm stand gives", () => {
  for (const crop of Object.keys(CROPS) as CropId[]) {
    const bought = buyProduce(createDefaultFarm(), 1000, crop);
    assert.ok(bought);
    const sold = sellProduce(bought.farm, crop, 1);
    assert.ok(sold);
    assert.ok(sold.coinsEarned < 1000 - bought.coins, crop);
  }
});

test("a vendor always has something to say", () => {
  const rng = seededRng(4);
  for (const situation of [
    "greeting-first",
    "greeting-regular",
    "tapped",
    "idle",
    "morning",
    "afternoon",
    "weather",
    "action-ordering",
    "action-tipping",
    "goodbye",
  ] as const) {
    const { text } = pickLine({
      role: "produce-vendor",
      situation,
      context: { name: "Sam", neighborhood: "uptown", venue: "farmers-market" },
      rng,
      bank: LINE_BANKS["produce-vendor"],
      tier: "teen",
    });
    assert.notEqual(text, "...", situation);
    assert.doesNotMatch(text, /[{}]/);
  }
});
