// The fleet's poses stay inside each kind's sway, repeat for the same time, and
// the fleets keep clear of the jet-ski course and the beach.

import assert from "node:assert/strict";
import { test } from "node:test";
import { WATER_Z } from "./city/layout.ts";
import {
  CITY_FLEET,
  MARINA_FLEET,
  SHIP_LENGTH,
  SHIP_SWAY,
  makePoses,
  shipModel,
  shipPose,
} from "./ships.ts";

test("a ship's pose is deterministic and never leaves its kind's sway", () => {
  const [pose] = makePoses(1);
  const again = makePoses(1)[0];
  assert.ok(pose && again);
  for (const [i, ship] of [...CITY_FLEET, ...MARINA_FLEET].entries()) {
    const sway = SHIP_SWAY[ship.kind];
    for (let t = 0; t < 600; t += 7.3) {
      shipPose(ship, i, t, pose);
      assert.deepEqual(shipPose(ship, i, t, again), pose);
      assert.ok(Math.abs(pose.y) <= sway.heave, ship.name);
      assert.ok(Math.abs(pose.roll) <= sway.roll, ship.name);
      assert.ok(Math.abs(pose.pitch) <= sway.pitch, ship.name);
      assert.ok(Math.abs(pose.yaw - ship.yaw) <= sway.swing, ship.name);
      assert.ok(
        Math.hypot(pose.x - ship.at[0], pose.z - ship.at[1]) <=
          sway.drift * Math.SQRT2,
      );
    }
  }
});

test("ships rock on their own phases, not in step", () => {
  const poses = makePoses(2);
  const [a, b] = poses;
  const ship = CITY_FLEET[1];
  assert.ok(a && b && ship);
  shipPose(ship, 0, 3, a);
  shipPose(ship, 1, 3, b);
  assert.notEqual(a.y, b.y);
});

test("the city's ships lie out at sea, and the marina's keep off the jet-ski course", () => {
  for (const s of CITY_FLEET) assert.ok(s.at[1] > WATER_Z + 90, s.name);
  for (const s of MARINA_FLEET) {
    const [x, z] = s.at;
    // the hull's footprint, a rectangle about 0.27 as wide as it is long, turned by its yaw
    const len = (SHIP_LENGTH[s.kind] * s.scale) / 2;
    const beam = len * 0.27;
    const halfX =
      Math.abs(Math.sin(s.yaw)) * len + Math.abs(Math.cos(s.yaw)) * beam + 2;
    const halfZ =
      Math.abs(Math.cos(s.yaw)) * len + Math.abs(Math.sin(s.yaw)) * beam + 2;
    const clearOfCourse =
      Math.abs(x) - halfX > 56 || z + halfZ < -76 || z - halfZ > -28;
    assert.ok(clearOfCourse, s.name);
  }
});

test("every ship is named, and no name is a real cruise line", () => {
  const names = new Set<string>();
  for (const s of [...CITY_FLEET, ...MARINA_FLEET]) {
    assert.ok(s.name.trim());
    names.add(s.name);
  }
  for (const real of [
    "carnival",
    "royal caribbean",
    "norwegian",
    "disney",
    "princess",
    "cunard",
    "msc",
  ])
    for (const n of names) assert.ok(!n.toLowerCase().includes(real), n);
});

test("the sail ship has a far twin, the others do not", () => {
  assert.equal(shipModel("sail", true), "ships/sail-lo");
  assert.equal(shipModel("sail", false), "ships/sail");
  assert.equal(shipModel("cruise", true), "ships/cruise");
});
