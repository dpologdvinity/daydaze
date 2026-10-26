import assert from "node:assert/strict";
import { test } from "node:test";
import { WALK_SPEED } from "../walk.ts";
import {
  MAX_TEMPO,
  MIN_TEMPO,
  gaitPace,
  walkPhaseRate,
  walkRate,
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

test("a gait walks at most MAX_TEMPO times its clip's pace, and never past the walk speed", () => {
  // a slow strut at 0.86 m/s natural walks at 1.075 m/s
  assert.ok(Math.abs(gaitPace(0.86) - 0.86 * MAX_TEMPO) < 1e-9);
  // the player's pace always plays her clip inside the clamp
  assert.ok(walkRate(gaitPace(0.86), 0.86) <= MAX_TEMPO);
  // a brisk clip is capped at the walk speed
  assert.equal(gaitPace(1.6), WALK_SPEED);
  // no clip measured: the walk speed
  assert.equal(gaitPace(undefined), WALK_SPEED);
  assert.equal(gaitPace(0), WALK_SPEED);
});

test("the built walk's phase turns once per stride of ground covered", () => {
  // 1.6 m/s on a 1.2 m stride: one loop every 0.75 s
  assert.ok(Math.abs(walkPhaseRate(1.6, 1.2) * 0.75 - 2 * Math.PI) < 1e-9);
  assert.equal(walkPhaseRate(0, 1.2), 0);
  assert.equal(walkPhaseRate(1.6, 0), 0);
});
