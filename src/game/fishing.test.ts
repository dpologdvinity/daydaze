import assert from "node:assert/strict";
import test from "node:test";
import {
  addCatch,
  biteDelay,
  castDistance,
  CAST_RANGE,
  CASTS,
  HOOK_WINDOW,
  NEW_TRIP,
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
