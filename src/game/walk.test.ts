import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WALK_SPEED,
  clampToWalkable,
  nearestPointOnPolygon,
  pointInPolygon,
  stepTowards,
  yawTowards,
  type Vec2,
} from "./walk.ts";

const square: Vec2[] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

// An L: the top-right 2 x 2 quarter of the square is cut out.
const ell: Vec2[] = [
  [0, 0],
  [4, 0],
  [4, 2],
  [2, 2],
  [2, 4],
  [0, 4],
];

function assertNear(actual: Vec2, expected: Vec2) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) < 1e-9 &&
      Math.abs(actual[1] - expected[1]) < 1e-9,
    `expected [${expected}], got [${actual}]`,
  );
}

const nonFinite = [Number.NaN, Infinity, -Infinity];

test("walking speed is a brisk 1.6 m/s", () => {
  assert.equal(WALK_SPEED, 1.6);
});

test("pointInPolygon handles convex and concave polygons", () => {
  assert.equal(pointInPolygon(square, [2, 2]), true);
  assert.equal(pointInPolygon(square, [5, 2]), false);
  assert.equal(pointInPolygon(ell, [1, 3]), true);
  assert.equal(pointInPolygon(ell, [3, 1]), true);
  assert.equal(pointInPolygon(ell, [3, 3]), false);
  assert.equal(pointInPolygon(ell, [-1, 1]), false);
});

test("pointInPolygon counts points on edges and vertices as inside", () => {
  assert.equal(pointInPolygon(square, [0, 2]), true);
  assert.equal(pointInPolygon(square, [4, 4]), true);
  assert.equal(pointInPolygon(ell, [2, 2]), true);
  assert.equal(pointInPolygon(ell, [3, 2]), true);
  assert.equal(pointInPolygon(ell, [2, 3]), true);
});

test("pointInPolygon rejects non-finite points", () => {
  for (const n of nonFinite) {
    assert.equal(pointInPolygon(square, [n, 2]), false);
    assert.equal(pointInPolygon(square, [2, n]), false);
  }
});

test("nearestPointOnPolygon projects onto the closest edge", () => {
  assertNear(nearestPointOnPolygon(square, [2, -3]), [2, 0]);
  assertNear(nearestPointOnPolygon(square, [6, 6]), [4, 4]);
  assertNear(nearestPointOnPolygon(square, [1, 2]), [0, 2]);
  // Inside the L's notch, the nearer inner edge wins.
  assertNear(nearestPointOnPolygon(ell, [3, 2.4]), [3, 2]);
  assertNear(nearestPointOnPolygon(ell, [2.4, 3]), [2, 3]);
});

test("nearestPointOnPolygon tolerates repeated vertices", () => {
  const doubled: Vec2[] = [[0, 0], [0, 0], ...square.slice(1)];
  assertNear(nearestPointOnPolygon(doubled, [-1, -1]), [0, 0]);
});

test("clampToWalkable keeps inside points and pulls outside ones to the edge", () => {
  assert.deepEqual(clampToWalkable(ell, [1, 1]), [1, 1]);
  assert.deepEqual(clampToWalkable(ell, [2, 2]), [2, 2]);
  const clamped = clampToWalkable(ell, [3.5, 2.6]);
  assertNear(clamped, [3.5, 2]);
  assert.equal(pointInPolygon(ell, clamped), true);
});

test("clampToWalkable turns non-finite points into a walkable point", () => {
  for (const n of nonFinite) {
    for (const p of [
      [n, 1],
      [1, n],
      [n, n],
    ] satisfies Vec2[]) {
      const clamped = clampToWalkable(ell, p);
      assert.ok(Number.isFinite(clamped[0]) && Number.isFinite(clamped[1]));
      assert.equal(pointInPolygon(ell, clamped), true);
    }
  }
});

test("stepTowards moves at most maxStep and stops on the target", () => {
  assertNear(stepTowards([0, 0], [3, 4], 1), [0.6, 0.8]);
  assert.deepEqual(stepTowards([0, 0], [3, 4], 5), [3, 4]);
  assert.deepEqual(stepTowards([0, 0], [3, 4], 9), [3, 4]);
});

test("stepTowards stays put for zero-length steps", () => {
  assert.deepEqual(stepTowards([1, 1], [1, 1], 1), [1, 1]);
  assert.deepEqual(stepTowards([1, 1], [3, 1], 0), [1, 1]);
  assert.deepEqual(stepTowards([1, 1], [3, 1], -2), [1, 1]);
});

test("stepTowards returns the start for non-finite input", () => {
  for (const n of nonFinite) {
    assert.deepEqual(stepTowards([1, 1], [n, 1], 1), [1, 1]);
    assert.deepEqual(stepTowards([1, 1], [1, n], 1), [1, 1]);
    assert.deepEqual(stepTowards([1, 1], [3, 1], n), [1, 1]);
  }
});

test("yawTowards is 0 facing +z and stays in (-pi, pi]", () => {
  assert.equal(yawTowards([0, 0], [0, 1]), 0);
  assert.equal(yawTowards([0, 0], [1, 0]), Math.PI / 2);
  assert.equal(yawTowards([0, 0], [-1, 0]), -Math.PI / 2);
  assert.equal(yawTowards([0, 0], [0, -1]), Math.PI);
  assert.equal(yawTowards([0, 0], [-0, -1]), Math.PI);
  assert.equal(yawTowards([-0, 0], [0, -1]), Math.PI);
});

test("yawTowards is 0 for zero-length or non-finite directions", () => {
  assert.equal(yawTowards([2, 3], [2, 3]), 0);
  for (const n of nonFinite) {
    assert.equal(yawTowards([0, 0], [n, 1]), 0);
    assert.equal(yawTowards([n, 0], [1, 1]), 0);
  }
});
