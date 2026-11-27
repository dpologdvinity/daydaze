// Fishing: casts land between the shortest and longest throw, bites come after
// the bobber lands, cast length limits the fish, and strike timing decides the catch.
import assert from "node:assert/strict";
import test from "node:test";
import {
  addCatch,
  biteDelay,
  BOARDWALK_SPECIES,
  castDistance,
  CAST_RANGE,
  CASTS,
  FARM_SPECIES,
  FISHING_SPOTS,
  FOREST_SPECIES,
  HOOK_WINDOW,
  MARINA_SPECIES,
  NEW_TRIP,
  OPEN_WATER_SPECIES,
  SPECIES,
  speciesFor,
  strike,
  tripKg,
  tripOver,
} from "./fishing.ts";

test("casts land between the shortest and longest throw", () => {
  assert.equal(castDistance(0), CAST_RANGE[0]);
  assert.equal(castDistance(1), CAST_RANGE[1]);
  assert.equal(castDistance(Number.NaN), CAST_RANGE[0]);
  assert.equal(castDistance(5), CAST_RANGE[1]);
});

test("bites come a few seconds after the bobber lands", () => {
  for (let seed = 0; seed < 50; seed++) {
    const d = biteDelay(seed);
    assert.ok(d >= 1.6 && d <= 5, `${d}`);
  }
});

test("short casts only reach the small fish; long ones can hook a marlin", () => {
  const near = new Set<string>();
  const far = new Set<string>();
  for (let seed = 0; seed < 400; seed++) {
    near.add(speciesFor(seed, 7).name);
    far.add(speciesFor(seed, 26).name);
  }
  assert.deepEqual([...near].sort(), ["Mackerel", "Sardine"]);
  assert.ok(far.has("Sunset marlin"));
  assert.equal(far.size, SPECIES.length);
});

test("a sharp strike lands the fish; early spooks it; late loses it", () => {
  const seed = 3;
  const sharp = strike(seed, 8, 0.1);
  assert.equal(sharp.outcome, "landed");
  assert.ok(sharp.kg > 0);
  assert.equal(strike(seed, 8, -0.2).outcome, "early");
  assert.equal(strike(seed, 8, HOOK_WINDOW + 0.1).outcome, "lost");
  assert.equal(strike(seed, 8, HOOK_WINDOW + 0.1).kg, 0);
});

test("a slow strike lands a small fish smaller, and loses a big one", () => {
  const smallSeed = [...Array(200).keys()].find(
    (s) => speciesFor(s, 8).name === "Mackerel",
  );
  assert.ok(smallSeed !== undefined);
  const quick = strike(smallSeed, 8, 0.1).kg;
  const slow = strike(smallSeed, 8, 0.6).kg;
  assert.ok(slow < quick);
  const bigSeed = [...Array(400).keys()].find(
    (s) => speciesFor(s, 26).name === "Sunset marlin",
  );
  assert.ok(bigSeed !== undefined);
  assert.equal(strike(bigSeed, 26, 0.6).outcome, "lost");
  assert.ok(strike(bigSeed, 26, 0.1).kg >= 15);
});

test("a trip is five casts, totalled to a tenth of a kilo", () => {
  let trip = NEW_TRIP;
  for (let i = 0; i < CASTS + 2; i++)
    trip = addCatch(trip, { species: "Mackerel", kg: 1.25, outcome: "landed" });
  assert.equal(trip.catches.length, CASTS);
  assert.ok(tripOver(trip));
  assert.equal(tripKg(trip), 6.3);
});

test("boardwalk catches come from its own common-fish table", () => {
  for (let seed = 0; seed < 100; seed++) {
    const fish = speciesFor(seed, 26, BOARDWALK_SPECIES);
    assert.ok(BOARDWALK_SPECIES.includes(fish));
    assert.ok(fish.kg[1] <= 4);
  }
});

test("strikes use the selected spot's fish table", () => {
  for (let seed = 0; seed < 100; seed++) {
    const catchResult = strike(seed, 26, 0.1, BOARDWALK_SPECIES);
    assert.ok(
      BOARDWALK_SPECIES.some((fish) => fish.name === catchResult.species),
    );
  }
});

test("sunny acres farm pond catches come from its small freshwater table", () => {
  const caught = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const fish = speciesFor(seed, 14, FARM_SPECIES);
    assert.ok(FARM_SPECIES.includes(fish));
    caught.add(fish.name);
    assert.ok(fish.kg[1] <= 5.0, `${fish.name} too big for pond`);
  }
  assert.ok(caught.has("Minnow"));
  assert.ok(caught.has("Bluegill"));
  assert.ok(caught.has("Golden koi"));
});

test("larkspur forest lake catches include trout, salmon and pike", () => {
  const caught = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const fish = speciesFor(seed, 18, FOREST_SPECIES);
    assert.ok(FOREST_SPECIES.includes(fish));
    caught.add(fish.name);
  }
  assert.ok(caught.has("Brook trout"));
  assert.ok(caught.has("Rainbow trout"));
  assert.ok(caught.has("Pike"));
});

test("open water catches include larger game fish", () => {
  const caught = new Set<string>();
  for (let seed = 0; seed < 400; seed++) {
    const fish = speciesFor(seed, 30, OPEN_WATER_SPECIES);
    assert.ok(OPEN_WATER_SPECIES.includes(fish));
    caught.add(fish.name);
  }
  assert.ok(caught.has("Giant trevally"));
  assert.ok(caught.has("Bluefin tuna"));
  const tuna = OPEN_WATER_SPECIES.find((s) => s.name === "Bluefin tuna");
  assert.ok(tuna && tuna.kg[1] >= 50);
});

test("fishing spots registry configures every spot with valid parameters", () => {
  const spotIds = [
    "marina",
    "boardwalk",
    "farm",
    "forest",
    "open-water",
  ] as const;
  assert.deepEqual(MARINA_SPECIES, SPECIES);
  for (const id of spotIds) {
    const spot = FISHING_SPOTS[id];
    assert.ok(spot, `spot ${id} must exist`);
    assert.equal(spot.id, id);
    assert.ok(spot.position.length === 2);
    assert.ok(spot.species.length >= 3);
    assert.ok(spot.dir === 1 || spot.dir === -1);
    assert.ok(typeof spot.yaw === "number");
    assert.ok(typeof spot.waterY === "number");
    assert.ok(spot.description.length > 0);
  }
  assert.deepEqual(FISHING_SPOTS.farm.castRange, [2.5, 8.5]);
  assert.equal(castDistance(1, FISHING_SPOTS.farm.castRange), 8.5);
});
