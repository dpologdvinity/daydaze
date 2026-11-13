import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUTTERFLY_RANGE,
  FLIGHT,
  FOREST_FLOCKS,
  GARDEN_FLOCKS,
  PARK_FLOCKS,
  PLACES,
  countOf,
  distanceTo,
  flockNear,
  flutter,
  isOut,
  wanderOf,
  type Pose,
} from "./butterflies.ts";

const ALL = [
  ["park", PARK_FLOCKS],
  ["forest", FOREST_FLOCKS],
  ["garden", GARDEN_FLOCKS],
] as const;

test("every flock lies inside its place and the low tier has no more than the high", () => {
  for (const [place, flocks] of ALL) {
    const area = PLACES[place];
    for (const f of flocks) {
      assert.ok(f.box.x0 >= area.x0 && f.box.x1 <= area.x1, place);
      assert.ok(f.box.z0 >= area.z0 && f.box.z1 <= area.z1, place);
      assert.ok(f.count.low > 0 && f.count.low <= f.count.high, place);
    }
    assert.ok(countOf(flocks, "low") <= countOf(flocks, "high"));
  }
});

test("a butterfly stays inside its flock's box and flight band, always", () => {
  const p: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  for (const [, flocks] of ALL)
    flocks.forEach((f, fi) => {
      for (let i = 0; i < f.count.high; i++)
        for (let t = 0; t < 600; t += 1.7) {
          flutter(f, wanderOf(fi, i), t, p);
          assert.ok(p.x >= f.box.x0 - 1e-9 && p.x <= f.box.x1 + 1e-9);
          assert.ok(p.z >= f.box.z0 - 1e-9 && p.z <= f.box.z1 + 1e-9);
          assert.ok(p.y >= f.ground + FLIGHT.min - 1e-9);
          assert.ok(p.y <= f.ground + FLIGHT.max + 1e-9);
          assert.ok(Number.isFinite(p.yaw));
        }
    });
});

test("a butterfly faces the way it flies and is the same every time", () => {
  const f = PARK_FLOCKS[0];
  const a: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  const b: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  const dt = 0.01;
  flutter(f, wanderOf(0, 2), 40, a);
  flutter(f, wanderOf(0, 2), 40 + dt, b);
  const heading = Math.atan2(b.x - a.x, b.z - a.z);
  assert.ok(
    Math.abs(Math.atan2(Math.sin(heading - a.yaw), Math.cos(heading - a.yaw))) <
      0.05,
  );
  const c: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  flutter(f, wanderOf(0, 2), 40, c);
  assert.deepEqual(c, a);
  // two butterflies of one flock do not fly together
  flutter(f, wanderOf(0, 3), 40, b);
  assert.notDeepEqual(b, a);
});

test("they wander at a gentle pace", () => {
  const f = GARDEN_FLOCKS[0];
  const a: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  const b: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  for (let i = 0; i < f.count.high; i++)
    for (let t = 0; t < 300; t += 7) {
      flutter(f, wanderOf(0, i), t, a);
      flutter(f, wanderOf(0, i), t + 1, b);
      assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 4, "under 4 m/s");
    }
});

test("park butterflies exist only near a flock, nearer on the low tier, and by day", () => {
  const f = PARK_FLOCKS[0];
  assert.ok(flockNear(f, 266, -277, "low"));
  assert.ok(!flockNear(f, 0, 0, "high"));
  const edge = f.box.x1 + (BUTTERFLY_RANGE.low + BUTTERFLY_RANGE.high) / 2;
  assert.ok(
    !flockNear(f, edge, -277, "low") && flockNear(f, edge, -277, "high"),
  );
  assert.ok(isOut(1) && !isOut(0));
});

test("distance to a box is zero inside it and straight-line outside", () => {
  const box = { x0: 0, x1: 4, z0: 0, z1: 2 };
  assert.equal(distanceTo(box, 2, 1), 0);
  assert.equal(distanceTo(box, 7, 1), 3);
  assert.equal(distanceTo(box, 7, 6), 5);
});
