// Quiet hours remove only ordinary traffic outside the player's view.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cabAtCurb, carPose, createTraffic, TRAFFIC_SEED } from "./traffic.ts";
import { updateAmbientTraffic } from "./trafficMood.ts";

test("the overnight roster preserves nearby traffic until it moves away", () => {
  const traffic = createTraffic(8, TRAFFIC_SEED);
  const fleet = traffic.cars.slice();
  const pose = { x: 0, z: 0, yaw: 0 };
  carPose(fleet[7], pose);
  const { x, z } = pose;
  const cab = cabAtCurb(401, [0, 0], [1, 0]);
  updateAmbientTraffic(traffic, fleet, 2, [x, z], 1, cab);
  assert.ok(traffic.cars.includes(fleet[7]));
  assert.ok(traffic.cars.includes(cab));
  updateAmbientTraffic(traffic, fleet, 2, [10000, 10000], 80, cab);
  const nightFleet = fleet.filter(
    (car) => car.id < 2 || car.kind === "heavy" || car.body === "taxi",
  );
  assert.deepEqual(traffic.cars, [...nightFleet, cab]);
  updateAmbientTraffic(traffic, fleet, 8, [x, z], 1, null);
  assert.ok(!traffic.cars.includes(fleet[7]));
  updateAmbientTraffic(traffic, fleet, 8, [10000, 10000], 80, null);
  assert.deepEqual(traffic.cars, fleet);
});

test("service vehicles beyond the overnight cutoff stay on the road", () => {
  const traffic = createTraffic(8, TRAFFIC_SEED);
  const fleet = traffic.cars.slice();
  fleet[7].kind = "heavy";
  updateAmbientTraffic(traffic, fleet, 2, [10000, 10000], 80, null);
  assert.ok(traffic.cars.includes(fleet[7]));
  assert.ok(traffic.cars.some((car) => car.body === "taxi" && car.id >= 2));
});
