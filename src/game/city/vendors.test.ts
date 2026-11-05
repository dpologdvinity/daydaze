// Street-food route, purchase and walk-up invariants.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ICE_CREAM_ROUTE,
  FOOD_CARTS,
  FOOD_MENUS,
  canOrderFood,
  buyStreetFood,
} from "./vendors.ts";
import { CITY_AREA, CITY_SURFACES } from "./layout.ts";
import { pointInPolygon } from "../walk.ts";

const pose = { x: 0, z: 0, yaw: 0, stop: -1, next: 0 };
test("ice-cream loop dwells thirty seconds at park and beach and repeats continuously", () => {
  const seen: number[] = [];
  let x = 0,
    z = 0;
  for (let t = 0; t < ICE_CREAM_ROUTE.cycle * 2; t += 0.1) {
    ICE_CREAM_ROUTE.at(t, pose);
    if (pose.stop >= 0 && seen.at(-1) !== pose.stop) seen.push(pose.stop);
    if (t) assert.ok(Math.hypot(pose.x - x, pose.z - z) < 0.81);
    assert.ok(
      CITY_SURFACES.some(
        (s) => s.kind === "road" && pointInPolygon(s.polygon, [pose.x, pose.z]),
      ),
      `road at ${t}: ${pose.x},${pose.z}`,
    );
    x = pose.x;
    z = pose.z;
  }
  assert.deepEqual(seen, [0, 1, 0, 1]);
  ICE_CREAM_ROUTE.at(29.999, pose);
  assert.equal(pose.stop, 0);
  ICE_CREAM_ROUTE.at(30, pose);
  assert.equal(pose.stop, -1);
  ICE_CREAM_ROUTE.at(ICE_CREAM_ROUTE.cycle, pose);
  assert.equal(pose.stop, 0);
  const start = { ...pose };
  ICE_CREAM_ROUTE.at(-ICE_CREAM_ROUTE.cycle, pose);
  assert.deepEqual(pose, start);
});
test("food purchase requires an open counter, walking nearby and a valid affordable item", () => {
  ICE_CREAM_ROUTE.at(0, pose);
  const at: [number, number] = [pose.x, pose.z + 3];
  assert.equal(canOrderFood("ice-cream", at, pose, true), true);
  assert.equal(canOrderFood("ice-cream", at, pose, false), false);
  assert.equal(canOrderFood("ice-cream", [0, 0], pose, true), false);
  ICE_CREAM_ROUTE.at(30, pose);
  assert.equal(canOrderFood("ice-cream", at, pose, true), false);
  assert.equal(buyStreetFood(100, "hot-dog", "classic"), 94);
  assert.equal(buyStreetFood(5, "hot-dog", "classic"), null);
  assert.equal(buyStreetFood(100, "hot-dog", "unknown"), null);
  assert.equal(buyStreetFood(100, "pretzel", "classic"), null);
  for (const coins of [-1, NaN, Infinity, 1.5])
    assert.equal(buyStreetFood(coins, "hot-dog", "classic"), null);
});
test("all four carts have small menus and reachable service positions", () => {
  assert.deepEqual(
    new Set(FOOD_CARTS.map((c) => c.kind)),
    new Set(["hot-dog", "pretzel", "halal", "churro"]),
  );
  for (const cart of FOOD_CARTS) {
    assert.ok(FOOD_MENUS[cart.kind].length >= 2);
    assert.ok(CITY_AREA.surfaces.some((s) => pointInPolygon(s, cart.service)));
    assert.ok(!CITY_AREA.blockers.some((s) => pointInPolygon(s, cart.service)));
    assert.equal(canOrderFood(cart.kind, cart.service, pose, true), true);
  }
});

test("truck serves the park north curb westbound and the beach south curb eastbound", () => {
  ICE_CREAM_ROUTE.at(0, pose);
  assert.ok(
    Math.cos(pose.yaw) < -0.99,
    "park is on the right of a westbound truck",
  );
  ICE_CREAM_ROUTE.at(ICE_CREAM_ROUTE.arrivals[1], pose);
  assert.ok(
    Math.cos(pose.yaw) > 0.99,
    "beach is on the right of an eastbound truck",
  );
  const beach = { ...pose };
  ICE_CREAM_ROUTE.at(ICE_CREAM_ROUTE.arrivals[1] + 29.999, pose);
  assert.deepEqual(pose, beach);
  ICE_CREAM_ROUTE.at(ICE_CREAM_ROUTE.arrivals[1] + 30, pose);
  assert.equal(pose.stop, -1);
});
