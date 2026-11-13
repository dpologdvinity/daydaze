import assert from "node:assert/strict";
import { test } from "node:test";
import { riseFrom, seatPose, startSit, stepSeatMove } from "./seatMove.ts";

// a bench seat at the origin facing +z, walked up to from the front (+z)
const spec = {
  approach: [0, 0.5] as const,
  at: [0, 0] as const,
  rootY: 0.02,
  yaw: 0,
  fromYaw: Math.PI, // she walked up facing the seat
  reach: 0.26,
  seconds: 1,
};
const pose = () => ({ x: 0, y: 0, z: 0, yaw: 0 });

test("sitting starts where the clip's hips are over the spot she stopped on", () => {
  const m = startSit(spec);
  const p = seatPose(m, pose());
  // the clip puts the hips `reach` ahead of the root, so the root starts behind the approach
  assert.ok(Math.abs(p.x) < 1e-9);
  assert.ok(Math.abs(p.z - (0.5 - 0.26)) < 1e-9);
  assert.equal(p.y, 0);
  assert.ok(Math.abs(p.yaw - Math.PI) < 1e-9);
});

test("sitting down ends on the seat, facing the way it faces, in `seconds`", () => {
  const m = startSit(spec);
  let t = 0;
  while (stepSeatMove(m, 1 / 60)) t += 1 / 60;
  assert.ok(Math.abs(t - 1) < 0.05, `took ${t}`);
  const p = seatPose(m, pose());
  assert.ok(Math.abs(p.z) < 1e-9 && Math.abs(p.x) < 1e-9);
  assert.equal(p.y, 0.02);
  assert.ok(Math.abs(p.yaw) < 1e-9);
});

test("she turns her back to the seat before the root moves much", () => {
  const m = startSit(spec);
  stepSeatMove(m, 0.4);
  const p = seatPose(m, pose());
  // 40% in: nearly round, not yet halfway to the seat
  assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw))) < 0.4);
  assert.ok(p.z > 0.1);
});

test("standing up walks the same path back to where she started", () => {
  const m = startSit(spec);
  while (stepSeatMove(m, 1 / 60));
  riseFrom(m, 1);
  while (stepSeatMove(m, 1 / 60));
  const p = seatPose(m, pose());
  assert.ok(Math.abs(p.z - 0.24) < 1e-9);
  assert.equal(p.y, 0);
});

test("a click mid-sit turns her round from where she is, with no jump", () => {
  const m = startSit(spec);
  stepSeatMove(m, 0.5);
  const before = seatPose(m, pose());
  riseFrom(m, 1);
  const after = seatPose(m, pose());
  assert.deepEqual(after, before);
  // and she is back on her feet in no more than the time she had sat for
  let t = 0;
  while (stepSeatMove(m, 1 / 60)) t += 1 / 60;
  assert.ok(t <= 0.55, `took ${t}`);
});

test("a long frame or a zero one cannot overshoot or break the blend", () => {
  const m = startSit(spec);
  assert.equal(stepSeatMove(m, 0), true);
  assert.equal(stepSeatMove(m, 99), false);
  assert.equal(m.p, 1);
  riseFrom(m, 1);
  assert.equal(stepSeatMove(m, 99), false);
  assert.equal(m.p, 0);
  // not a number in: stays put
  assert.equal(stepSeatMove(m, Number.NaN), false);
  assert.equal(m.p, 0);
});

test("a lying seat has no reach: she lowers straight onto it", () => {
  const m = startSit({ ...spec, reach: 0 });
  const p = seatPose(m, pose());
  assert.ok(Math.abs(p.z - 0.5) < 1e-9);
});
