// Route, timetable and boarding invariants for the city's fixed-loop bus.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUS_STOPS,
  BUS_DWELL,
  BUS_CYCLE,
  busAt,
  nextBusIn,
  canBoard,
  canGetOff,
  type BusPose,
} from "./transit.ts";
import { pointInPolygon as contains } from "../walk.ts";
import { CITY_AREA, CITY_SURFACES } from "./layout.ts";

const pose: BusPose = { x: 0, z: 0, yaw: 0, stop: -1, next: 0 };
test("the bus visits every stop in order, then repeats without a teleport", () => {
  const seen: number[] = [];
  let x = 0,
    z = 0;
  for (let t = 0; t < BUS_CYCLE * 2; t += 0.1) {
    busAt(t, pose);
    if (pose.stop >= 0 && seen.at(-1) !== pose.stop) seen.push(pose.stop);
    if (t > 0) assert.ok(Math.hypot(pose.x - x, pose.z - z) < 1.1);
    x = pose.x;
    z = pose.z;
  }
  assert.deepEqual(seen, [0, 1, 2, 3, 0, 1, 2, 3]);
});
test("a full dwell stays stationary and boarding closes exactly on departure", () => {
  busAt(0, pose);
  const { x, z } = pose;
  busAt(BUS_DWELL - 0.001, pose);
  assert.equal(pose.stop, 0);
  assert.equal(pose.x, x);
  assert.equal(pose.z, z);
  assert.equal(canBoard(pose, 0, BUS_STOPS[0].at, false), true);
  assert.equal(canBoard(pose, 0, [100, 100], false), false);
  assert.equal(canBoard(pose, 0, BUS_STOPS[0].at, true), false);
  assert.equal(canBoard(pose, 1, BUS_STOPS[0].at, false), false);
  busAt(BUS_DWELL, pose);
  assert.equal(pose.stop, -1);
  assert.equal(canGetOff(pose), false);
});
test("arrival estimates match actual arrival, include other dwells and wrap the cycle", () => {
  for (let t = 0; t < BUS_CYCLE; t += 1.7) {
    for (let stop = 0; stop < BUS_STOPS.length; stop++) {
      const eta = nextBusIn(t, stop);
      assert.ok(eta >= 0 && eta < BUS_CYCLE);
      busAt(t + eta + 0.00001, pose);
      assert.equal(pose.stop, stop);
      assert.equal(canGetOff(pose), true);
      if (eta > 0.01) {
        busAt(t + eta - 0.001, pose);
        assert.equal(pose.stop, -1);
      }
    }
  }
  assert.equal(nextBusIn(0, 0), 0);
  assert.equal(nextBusIn(BUS_CYCLE + 1, 0), 0);
});
test("all stops let riders out on walkable city sidewalks", () => {
  for (const stop of BUS_STOPS) {
    assert.ok(
      CITY_AREA.surfaces.some((s) => contains(s, stop.at)),
      stop.name,
    );
    assert.ok(!CITY_AREA.blockers.some((s) => contains(s, stop.at)), stop.name);
    assert.ok(
      !CITY_AREA.portals.some(
        (p) =>
          Math.hypot(p.position[0] - stop.at[0], p.position[1] - stop.at[1]) <
          p.radius + 1,
      ),
      stop.name,
    );
  }
});

// Cutting a corner onto a sidewalk would pass timetable tests but hit buildings.
test("the whole loop follows city asphalt", () => {
  for (let t = 0; t < BUS_CYCLE; t += 0.1) {
    busAt(t, pose);
    assert.ok(
      CITY_SURFACES.some(
        (s) => s.kind === "road" && contains(s.polygon, [pose.x, pose.z]),
      ),
    );
  }
});
