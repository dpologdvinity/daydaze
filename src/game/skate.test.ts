import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gradePress,
  HALF_WIDTH,
  LIP_Y,
  lipTime,
  NEW_RUN,
  press,
  riderAt,
} from "./skate.ts";

test("she drops in at the -x lip and rolls to the other, then airs off it", () => {
  const start = riderAt(0);
  assert.ok(Math.abs(start.x + HALF_WIDTH) < 1e-6);
  assert.ok(Math.abs(start.y - LIP_Y) < 1e-6);
  const mid = riderAt(lipTime(0) / 2);
  assert.ok(Math.abs(mid.x) < 0.2 && mid.y < 0.01);
  const air = riderAt(lipTime(0) + 0.3);
  assert.notEqual(air.air, null);
  assert.ok(air.y > LIP_Y);
  // and back the other way
  assert.equal(riderAt(lipTime(0) + 1).heading, -1);
});

test("the ride never leaves the pipe's profile", () => {
  for (let t = 0; t < 30; t += 0.05) {
    const p = riderAt(t);
    assert.ok(Math.abs(p.x) <= HALF_WIDTH + 1e-6, `x at ${t}`);
    assert.ok(p.y >= -1e-6, `y at ${t}`);
  }
});

test("presses are graded against the coming lip", () => {
  const lip = lipTime(2);
  assert.equal(gradePress(lip - 0.05)?.grade, "perfect");
  assert.equal(gradePress(lip - 0.2)?.grade, "good");
  assert.equal(gradePress(lip - 0.5)?.grade, "bail");
  assert.equal(gradePress(lip - 1.2), null);
  assert.equal(gradePress(lip - 0.05)?.lip, 2);
});

test("tricks in a row build a combo; a bail drops it; each lip counts once", () => {
  let run = NEW_RUN;
  run = press(run, lipTime(0) - 0.05);
  run = press(run, lipTime(1) - 0.05);
  assert.equal(run.combo, 2);
  assert.equal(run.score, 300 + 600);
  const again = press(run, lipTime(1) - 0.04);
  assert.equal(again, run);
  run = press(run, lipTime(2) - 0.5);
  assert.equal(run.combo, 0);
  assert.equal(run.last?.grade, "bail");
});
