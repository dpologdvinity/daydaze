import assert from "node:assert/strict";
import { test } from "node:test";
import { WALK_SPEED } from "../walk.ts";
import {
  MAX_TEMPO,
  MIN_TEMPO,
  walkPhaseRate,
  runRate,
  walkRate,
  MAX_RUN_TEMPO,
  needsRun,
} from "./stride.ts";

test("a walk clip plays at ground speed over its own pace, within the clamp", () => {
  // a 1.2 m/s clip walked at 1.32 m/s plays 10% fast
  assert.ok(Math.abs(walkRate(1.32, 1.2) - 1.1) < 1e-9);
  // far too fast or too slow for the clip: clamped, never a blur or a crawl
  assert.equal(walkRate(4, 1.2), MAX_TEMPO);
  assert.equal(walkRate(0.2, 1.2), MIN_TEMPO);
  // standing still, or a clip with no measured pace: as recorded
  assert.equal(walkRate(0, 1.2), 1);
  assert.equal(walkRate(1.2, 0), 1);
  assert.equal(walkRate(Number.NaN, 1.2), 1);
});

test("a walk clip that cannot keep up hands over to the jog", () => {
  // within the walk clip's tempo clamp: keep walking
  assert.equal(needsRun(1.2, 1.0), false);
  assert.equal(needsRun(1.25, 1.0), false);
  // brisk game pace on a 1 m/s walk clip would play at 2.6x: run instead
  assert.equal(needsRun(WALK_SPEED, 0.984), true);
  // a clip with no measured pace never switches
  assert.equal(needsRun(WALK_SPEED, 0), false);
  // the jog (1.676 m/s) covers brisk pace at a sane rate, clamped when pushed
  assert.ok(Math.abs(runRate(WALK_SPEED, 1.676) - WALK_SPEED / 1.676) < 1e-9);
  assert.ok(runRate(WALK_SPEED, 1.676) <= MAX_RUN_TEMPO);
  assert.equal(runRate(20, 1.676), MAX_RUN_TEMPO);
  assert.equal(runRate(0.1, 1.676), MIN_TEMPO);
  assert.equal(runRate(2, 0), 1);
});

test("the built walk's phase turns once per stride of ground covered", () => {
  // 1.6 m/s on a 1.2 m stride: one loop every 0.75 s
  assert.ok(Math.abs(walkPhaseRate(1.6, 1.2) * 0.75 - 2 * Math.PI) < 1e-9);
  assert.equal(walkPhaseRate(0, 1.2), 0);
  assert.equal(walkPhaseRate(1.6, 0), 0);
});
