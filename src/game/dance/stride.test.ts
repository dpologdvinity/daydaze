import assert from "node:assert/strict";
import { test } from "node:test";
import { WALK_SPEED } from "../walk.ts";
import { LEG, clipStride, gaitPace, walkPhaseRate } from "./stride.ts";

const key = (at: number, leg: number, shin = 0) => ({
  at,
  joints: { lLeg: [leg, 0, 0] as const, lShin: [shin, 0, 0] as const },
});

test("a walk clip's stride is twice its foot's swing, from the hip and knee angles", () => {
  const clip = { keys: [key(0, -0.3), key(0.5, 0.3), key(1, -0.3)] };
  const swing = 2 * LEG.thigh * Math.sin(0.3) + 2 * LEG.shin * Math.sin(0.3);
  assert.ok(Math.abs(clipStride(clip) - 2 * swing) < 1e-9);
  // a knee still bent as the leg swings forward shortens the reach
  const bent = {
    keys: [key(0, -0.3, 0.6), key(0.5, 0.3), key(1, -0.3, 0.6)],
  };
  assert.ok(clipStride(bent) < clipStride(clip));
});

test("the walk phase turns once per stride of ground covered, so feet stay planted", () => {
  // 1.6 m/s on a 1.2 m stride: one loop every 0.75 s
  assert.ok(Math.abs(walkPhaseRate(1.6, 1.2) * 0.75 - 2 * Math.PI) < 1e-9);
  assert.equal(walkPhaseRate(0, 1.2), 0);
  // a degenerate clip never spins the legs
  assert.equal(walkPhaseRate(1.6, 0), 0);
});

test("a gait walks at most half again its clip's own pace, and never past the walk speed", () => {
  // a slow strut: 0.9 m a loop, 1.2 s a loop (0.75 m/s natural)
  assert.ok(Math.abs(gaitPace(0.9, 1.2) - 1.125) < 1e-9);
  // a brisk clip is capped at the walk speed
  assert.equal(gaitPace(1.6, 0.85), WALK_SPEED);
  // no clip measured: the walk speed
  assert.equal(gaitPace(0, 1), WALK_SPEED);
});
