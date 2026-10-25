// Tests for Photon Zone's target range: targets slide along three rails on
// the north wall, a beam on one lights it up, and a drill ends when the
// shots or the clock run out.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ARENA } from "./laserTag.ts";
import {
  DRILL_SECONDS,
  drillOver,
  fireAt,
  newDrill,
  SHOTS,
  targetAt,
} from "./targetRange.ts";

test("targets ride three rails on the north wall, inside the arena", () => {
  const d = newDrill("pistol", 5);
  const heights = new Set<number>();
  for (const target of d.targets)
    for (const t of [0, 7, 33]) {
      const [x, y, z] = targetAt(target, t);
      assert.ok(x > ARENA.x0 && x < ARENA.x1);
      assert.ok(z > ARENA.z0 && z < ARENA.z0 + 1);
      heights.add(y);
    }
  assert.equal(heights.size, 3);
});

test("a beam on a target lights it up and scores; a miss only costs a shot", () => {
  const d = newDrill("rifle", 9);
  const target = d.targets[2];
  assert.ok(target);
  const [x, y] = targetAt(target, 4);
  const hit = fireAt(d, x, y, 4);
  assert.equal(hit.lit?.id, target.id);
  assert.ok(hit.drill.score > 0);
  assert.equal(hit.drill.shots, SHOTS.rifle - 1);
  const miss = fireAt(hit.drill, ARENA.x0 + 0.1, 0.1, 5);
  assert.equal(miss.lit, null);
  assert.equal(miss.drill.score, hit.drill.score);
});

test("the pistol has more shots than the rifle; drills end on time or empty", () => {
  assert.ok(SHOTS.pistol > SHOTS.rifle);
  let d = newDrill("pistol", 1);
  assert.equal(drillOver(d, DRILL_SECONDS), true);
  for (let i = 0; i < SHOTS.pistol; i++) d = fireAt(d, 0, 1, 1).drill;
  assert.equal(drillOver(d, 1), true);
  assert.equal(fireAt(d, 0, 1, 1).drill, d);
});
