import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon } from "./walk.ts";
import {
  CRABS,
  DIVE_BUOY,
  DOLPHINS,
  EXIT,
  FLOOR,
  GULLS,
  SCHOOLS,
  SPAWN,
  SURFACE_LANDING,
  depthAt,
  paceIn,
  waterState,
} from "./openWater.ts";

test("the sand is dry, then the sea deepens steadily", () => {
  assert.equal(depthAt(0, 10), 0);
  assert.equal(depthAt(0, 3), 0);
  let last = 0;
  for (let z = 2; z > -60; z -= 1) {
    const d = depthAt(0, z);
    assert.ok(d >= last, `depth never shrinks going out (z ${z})`);
    last = d;
  }
  assert.ok(last <= 8);
});

test("wading comes before swimming, and each slows the player more", () => {
  assert.equal(waterState(depthAt(0, 8)), "dry");
  assert.equal(waterState(depthAt(0, 1.5)), "wade");
  assert.equal(waterState(depthAt(0, -10)), "swim");
  assert.ok(paceIn("dry") > paceIn("wade"));
  assert.ok(paceIn("wade") > paceIn("swim"));
});

test("spawn, exit, dive buoy and the surface landing are all on the floor", () => {
  for (const p of [SPAWN, EXIT, DIVE_BUOY, SURFACE_LANDING])
    assert.ok(pointInPolygon(FLOOR, p), String(p));
  assert.equal(waterState(depthAt(...DIVE_BUOY)), "swim");
});

test("the dive buoy is in water deep enough to swim, off the beach life", () => {
  for (const s of SCHOOLS) assert.ok(pointInPolygon(FLOOR, s.at));
  for (const d of DOLPHINS) assert.ok(d.center[1] < DIVE_BUOY[1] - 8);
  for (const g of GULLS) assert.equal(waterState(depthAt(...g.at)), "dry");
  for (const c of CRABS) assert.equal(waterState(depthAt(...c)), "dry");
});

test("the wildlife stays inside the low-tier creature budget", () => {
  const fish = SCHOOLS.reduce((n, s) => n + s.count, 0);
  assert.ok(fish + DOLPHINS.length + GULLS.length + CRABS.length <= 30);
});
