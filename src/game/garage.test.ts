import { test } from "node:test";
import assert from "node:assert/strict";
import { ROAD_CARS } from "./driving/roster.ts";
import { buyCar, cleanGarage, priceOf, STARTER } from "./garage.ts";

test("a garage always has the starter, and only real road cars, once", () => {
  assert.deepEqual(cleanGarage(null), [STARTER]);
  assert.deepEqual(
    cleanGarage(["kestrel-rs", "kestrel-rs", "zip-kart", 4, "rocket"]),
    [STARTER, "kestrel-rs"],
  );
});

test("buying a car takes its dealership price and adds it once", () => {
  assert.deepEqual(buyCar(1000, [STARTER], "pebble"), {
    ok: true,
    coins: 860,
    garage: [STARTER, "pebble"],
  });
  assert.deepEqual(buyCar(100, [STARTER], "pebble"), {
    ok: false,
    reason: "coins",
  });
  assert.deepEqual(buyCar(1000, [STARTER, "pebble"], "pebble"), {
    ok: false,
    reason: "owned",
  });
  assert.deepEqual(buyCar(1000, [STARTER], "zip-kart"), {
    ok: false,
    reason: "unknown",
  });
});

test("prices climb from a few games for a hatchback to a fortune for the hypercar", () => {
  const pebble = ROAD_CARS.find((c) => c.id === "pebble");
  const zenith = ROAD_CARS.find((c) => c.id === "zenith-x");
  assert.ok(pebble && zenith);
  assert.equal(priceOf(pebble), 140);
  assert.equal(priceOf(zenith), 8800);
});
