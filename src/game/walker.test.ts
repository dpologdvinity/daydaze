import { test } from "node:test";
import assert from "node:assert/strict";
import { roomArea } from "./area.ts";
import { CITY_AREA } from "./city/layout.ts";
import { ROOMS } from "./rooms.ts";
import { createWalker, SIM_STEP, setTarget, stepWalker } from "./walker.ts";
import { WALK_SPEED } from "./walk.ts";

const plaza = roomArea(ROOMS.plaza);

test("one step moves WALK_SPEED times the step length, however often steps run", () => {
  const w = createWalker({ position: [0, 0], yaw: 0 });
  const r = stepWalker(w, plaza, [0, 1], SIM_STEP);
  assert.equal(r.moved, true);
  // a 50 Hz step is 4.4 cm at walking pace
  assert.ok(
    Math.abs(w.pos[1] - WALK_SPEED * SIM_STEP) < 1e-9,
    `moved ${w.pos[1]}`,
  );
  assert.equal(w.pos[0], 0);
});

test("a target is reached and then forgotten", () => {
  const w = createWalker({ position: [0, 0], yaw: 0 });
  setTarget(w, plaza, [2, 0]);
  let steps = 0;
  while (w.target && steps < 500) {
    stepWalker(w, plaza, null, SIM_STEP);
    steps++;
  }
  assert.equal(w.target, null);
  assert.ok(Math.hypot(w.pos[0] - 2, w.pos[1]) < 1e-9);
  assert.ok(steps < 500);
});

test("the yaw eases towards the way the walker is going", () => {
  const w = createWalker({ position: [0, 0], yaw: 0 });
  for (let i = 0; i < 100; i++) stepWalker(w, plaza, [1, 0], SIM_STEP);
  assert.ok(Math.abs(w.yaw - Math.PI / 2) < 0.05, `yaw ${w.yaw}`);
});

test("walking into a blocked edge stops the walker", () => {
  const w = createWalker({ position: [0, 0], yaw: 0 });
  // the plaza's back wall sits at z = -7
  for (let i = 0; i < 400; i++) stepWalker(w, plaza, [0, -1], SIM_STEP);
  assert.ok(w.pos[1] >= -7 - 1e-9);
  const r = stepWalker(w, plaza, [0, -1], SIM_STEP);
  assert.equal(r.moved, false);
});

test("a portal fires once per visit and then the walker is leaving", () => {
  const w = createWalker({ position: [0, -5.6], yaw: 0 });
  let fired = 0;
  for (let i = 0; i < 40; i++) {
    const r = stepWalker(w, plaza, [0, -1], SIM_STEP);
    if (r.portal) fired++;
  }
  assert.equal(fired, 1);
  assert.equal(w.leaving, true);
  const after = stepWalker(w, plaza, [0, 1], SIM_STEP);
  assert.deepEqual(after, { moved: false, portal: null });
});

test("the city door fires from the sidewalk without any frame timing", () => {
  const w = createWalker({ position: [112, -9], yaw: 0 });
  let portal = null;
  for (let i = 0; i < 400 && !portal; i++) {
    portal = stepWalker(w, CITY_AREA, [0, -1], SIM_STEP).portal;
  }
  assert.equal(portal?.target, "velvet-room");
});
