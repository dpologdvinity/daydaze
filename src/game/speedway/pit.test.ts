// Tests for Speedway pit mechanics.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CarState } from "../driving/car.ts";
import {
  createPitState,
  stepPitState,
  applyTireGrip,
  type PitBox,
} from "./pit.ts";

const box: PitBox = { position: [0, -10], radius: 4 };

test("initial pit state is not in pit, zero stopped time, fresh tires", () => {
  const pit = createPitState();
  assert.equal(pit.inBox, false);
  assert.equal(pit.stoppedMs, 0);
  assert.equal(pit.serviced, false);
  assert.equal(pit.stopsCompleted, 0);
  assert.equal(pit.tireWear, 0);
});

test("entering pit box marks inBox true", () => {
  const pit = createPitState();
  const car: CarState = { position: [0, -10], yaw: 0, speed: 1.0 };
  const next = stepPitState(pit, car, box, 20);
  assert.equal(next.inBox, true);
});

test("stopping in pit box accumulates service time and finishes pit stop", () => {
  let pit = createPitState();
  pit = { ...pit, tireWear: 0.8 }; // worn tires
  const car: CarState = { position: [0, -10], yaw: 0, speed: 0.5 };

  // Step for 1 second (1000 ms)
  for (let i = 0; i < 50; i++) {
    pit = stepPitState(pit, car, box, 20);
  }
  assert.equal(pit.inBox, true);
  assert.equal(pit.serviced, false);
  assert.equal(pit.stoppedMs, 1000);

  // Step for another 1 second to reach PIT_SERVICE_MS (2000 ms)
  for (let i = 0; i < 50; i++) {
    pit = stepPitState(pit, car, box, 20);
  }
  assert.equal(pit.serviced, true);
  assert.equal(pit.stopsCompleted, 1);
  assert.equal(pit.tireWear, 0); // tires reset to fresh
});

test("moving fast through pit box does not count as stopped service", () => {
  let pit = createPitState();
  const car: CarState = { position: [0, -10], yaw: 0, speed: 15 };
  for (let i = 0; i < 100; i++) {
    pit = stepPitState(pit, car, box, 20);
  }
  assert.equal(pit.stoppedMs, 0);
  assert.equal(pit.serviced, false);
});

test("driving increases tire wear over distance", () => {
  const pit = createPitState();
  const car: CarState = { position: [100, 0], yaw: 0, speed: 30 };
  const outsideBox: PitBox = { position: [0, 50], radius: 4 };
  const next = stepPitState(pit, car, outsideBox, 20);
  assert.ok(next.tireWear > pit.tireWear);
});

test("applyTireGrip reduces grip as wear increases", () => {
  const freshGrip = applyTireGrip(0.9, 0);
  const wornGrip = applyTireGrip(0.9, 1.0);
  assert.equal(freshGrip, 0.9);
  assert.ok(wornGrip < freshGrip);
  assert.ok(wornGrip >= 0.9 * 0.7); // wear reduces grip by at most 30%
});

test("the oval's pit box is on the tarmac and clear of every wall", async () => {
  const { TRACKS, trackWalls, PIT_BOX_X, PIT_LANE_Z } =
    await import("./track.ts");
  const track = TRACKS[0];
  const box = track.pitBox;
  assert.ok(box, "the oval has a pit box");
  // the box center is inside the drivable width of the nearest centerline point
  const nearest = Math.min(
    ...track.centerline.map((p) =>
      Math.hypot(p[0] - box.position[0], p[1] - box.position[1]),
    ),
  );
  assert.ok(nearest < track.width / 2, `${nearest} m off the centerline`);
  // and not inside any wall: a car can drive to it
  const inside = (
    poly: readonly (readonly [number, number])[],
    p: readonly [number, number],
  ) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if (
        zi > p[1] !== zj > p[1] &&
        p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi
      )
        hit = !hit;
    }
    return hit;
  };
  for (const wall of trackWalls(track))
    assert.ok(!inside(wall, box.position), "the box is not inside a wall");
  // the six painted boxes line up on that same lane
  assert.equal(PIT_BOX_X.length, 6);
  assert.equal(box.position[1], PIT_LANE_Z);
  assert.ok(PIT_BOX_X.includes(box.position[0]));
});
