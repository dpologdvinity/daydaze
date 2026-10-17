import assert from "node:assert/strict";
import test from "node:test";
import { areaOf, isBlocked, stepInArea } from "./area.ts";
import {
  AUDIENCE,
  PROGRAM,
  PROGRAM_SECONDS,
  RUNWAY,
  strutAt,
} from "./catwalk.ts";
import { closeOut, judgesScore, newRoutine, press } from "./gymnastics.ts";
import { ROOMS } from "./rooms.ts";
import type { Vec2 } from "./walk.ts";

test("Runway Walk's cues come in order, inside the show", () => {
  PROGRAM.forEach((e, i) => {
    if (i) assert.ok(e.at > PROGRAM[i - 1].at, e.name);
    assert.ok(e.at < PROGRAM_SECONDS);
  });
  let r = newRoutine(PROGRAM);
  for (const e of PROGRAM) r = press(r, e.at, PROGRAM);
  const best = 10 + PROGRAM.reduce((t, e) => t + e.difficulty, 0);
  assert.equal(judgesScore(r, PROGRAM), Math.round(best * 1000) / 1000);
  const skipped = closeOut(newRoutine(PROGRAM), PROGRAM_SECONDS, PROGRAM);
  assert.equal(judgesScore(skipped, PROGRAM), 10 - 0.5 * PROGRAM.length);
});

test("she stays on the runway, struts between poses and ends facing the judges", () => {
  for (let t = -1; t <= PROGRAM_SECONDS + 1; t += 0.1) {
    const { z } = strutAt(t);
    assert.ok(z >= RUNWAY.z0 && z <= RUNWAY.z1, `on the runway at ${t}`);
  }
  assert.equal(strutAt(2).stride, true);
  // holding the end pose, then turning back: not striding
  assert.equal(strutAt(6.4).stride, false);
  assert.equal(strutAt(7.8).stride, false);
  const end = strutAt(PROGRAM_SECONDS);
  assert.equal(end.stride, false);
  assert.equal(Math.cos(end.yaw), 1);
});

test("the runway is solid; the audience's spots and the door walk free", () => {
  const room = ROOMS.catwalk;
  const area = areaOf(room);
  assert.equal(isBlocked(area, [0, 0]), true);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of AUDIENCE) {
    assert.equal(isBlocked(area, goal), false, `clear at ${goal}`);
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3, `${goal}`);
  }
});
