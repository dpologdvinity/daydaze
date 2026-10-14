import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToPolygon, isInsidePolygon } from "./walkable.ts";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
// An L shape: the notch at x > 5, z > 5 is not walkable.
const ell: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 5],
  [5, 5],
  [5, 10],
  [0, 10],
];

test("points inside the polygon are detected, including concave shapes", () => {
  assert.equal(isInsidePolygon(square, 5, 5), true);
  assert.equal(isInsidePolygon(square, -1, 5), false);
  assert.equal(isInsidePolygon(ell, 2, 8), true);
  assert.equal(isInsidePolygon(ell, 8, 2), true);
  assert.equal(isInsidePolygon(ell, 8, 8), false);
});

test("inside points are kept and outside points move to the nearest edge", () => {
  assert.deepEqual(clampToPolygon(square, 3, 4), [3, 4]);
  assert.deepEqual(clampToPolygon(square, -5, 4), [0, 4]);
  assert.deepEqual(clampToPolygon(square, 15, 15), [10, 10]);
  assert.deepEqual(clampToPolygon(ell, 9, 6), [9, 5]);
  assert.deepEqual(clampToPolygon(ell, 6, 9), [5, 9]);
});
