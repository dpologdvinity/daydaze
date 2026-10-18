import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANNED_BRANDS,
  BUMPER_CAR,
  CARS,
  carById,
  ROAD_CARS,
} from "./roster.ts";

test("car ids are unique and carById finds each", () => {
  const ids = CARS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const car of CARS) assert.equal(carById(car.id), car);
  assert.equal(carById("nope"), null);
});

test("the roster runs cheap to expensive across classes", () => {
  const order = ["beater", "everyday", "luxury", "sports", "exotic"] as const;
  const cheapest = order.map((cls) =>
    Math.min(...CARS.filter((c) => c.class === cls).map((c) => c.price)),
  );
  for (let i = 1; i < cheapest.length; i++)
    assert.ok(cheapest[i] > cheapest[i - 1]);
});

test("no car name or description uses a real brand", () => {
  for (const car of [...CARS, BUMPER_CAR]) {
    const text = `${car.name} ${car.basedOn}`.toLowerCase();
    for (const brand of BANNED_BRANDS) {
      assert.ok(
        !new RegExp(`\\b${brand}\\b`).test(text),
        `${car.id} mentions ${brand}`,
      );
    }
  }
});

test("every spec has sane positive numbers", () => {
  for (const car of [...CARS, BUMPER_CAR]) {
    for (const v of [
      car.topSpeed,
      car.accel,
      car.brake,
      car.turnRate,
      car.length,
      car.width,
      car.seats,
    ]) {
      assert.ok(Number.isFinite(v) && v > 0, car.id);
    }
    assert.ok(car.grip > 0 && car.grip <= 1, car.id);
  }
});

test("the city has at least ten road cars, sports cars among them", () => {
  assert.ok(ROAD_CARS.length >= 10);
  assert.ok(ROAD_CARS.filter((c) => c.class === "sports").length >= 3);
  assert.ok(ROAD_CARS.every((c) => c.class !== "kart" && c.class !== "bumper"));
});
