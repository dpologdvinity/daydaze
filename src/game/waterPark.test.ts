import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "./rooms.ts";
import { pointInPolygon } from "./walk.ts";
import {
  pathLength,
  POOL,
  samplePath,
  SLIDES,
  type Vec3,
} from "./waterPark.ts";

const L: readonly Vec3[] = [
  [0, 0, 0],
  [0, 0, 3],
  [4, 0, 3],
];

test("pathLength adds up the segments", () => {
  assert.equal(pathLength(L), 7);
  assert.equal(pathLength([[1, 2, 3]]), 0);
});

test("samplePath walks the path by distance and faces along it", () => {
  assert.deepEqual(samplePath(L, 0), { point: [0, 0, 0], yaw: 0 });
  assert.deepEqual(samplePath(L, 1.5 / 7).point, [0, 0, 1.5]);
  const late = samplePath(L, 5 / 7);
  assert.deepEqual(late.point, [2, 0, 3]);
  assert.equal(late.yaw, Math.PI / 2);
  assert.deepEqual(samplePath(L, 1).point, [4, 0, 3]);
});

test("samplePath clamps t and survives bad input", () => {
  assert.deepEqual(samplePath(L, -2).point, [0, 0, 0]);
  assert.deepEqual(samplePath(L, 9).point, [4, 0, 3]);
  assert.deepEqual(samplePath(L, Number.NaN).point, [0, 0, 0]);
  assert.deepEqual(samplePath([], 0.5), { point: [0, 0, 0], yaw: 0 });
});

test("every slide runs downhill from the tower into the wave pool", () => {
  for (const slide of SLIDES) {
    const { path } = slide;
    for (let i = 1; i < path.length; i++)
      assert.ok(path[i][1] <= path[i - 1][1], `${slide.id} climbs at ${i}`);
    const [x, y, z] = path[path.length - 1];
    assert.equal(y, POOL.water);
    assert.ok(x > POOL.x0 && x < POOL.x1 && z > POOL.z0 && z < POOL.z1);
  }
});

test("slide riders climb out onto the Water Park deck", () => {
  const { walkable } = ROOMS["water-park"];
  for (const slide of SLIDES)
    assert.equal(pointInPolygon(walkable, slide.exit), true, slide.id);
});

test("the Water Park is a swimwear room and the others are not", () => {
  assert.equal(ROOMS["water-park"].swimwear, true);
  assert.ok(!ROOMS.plaza.swimwear);
  assert.ok(!ROOMS["velvet-room"].swimwear);
});
