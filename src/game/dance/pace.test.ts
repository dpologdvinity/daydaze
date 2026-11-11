import assert from "node:assert/strict";
import { test } from "node:test";
import { WALK_SPEED } from "../walk.ts";
import { MAX_TEMPO } from "./stride.ts";
import {
  HURRY_AFTER,
  HURRY_DISTANCE,
  SLOW_DISTANCE,
  createPace,
  stepPace,
  strollPace,
} from "./pace.ts";

const idle = { clipSpeed: 1, remaining: null, held: false } as const;

test("a style strolls at its clip's pace, a little brisk, never past the hurry", () => {
  assert.ok(strollPace(1) > 1 && strollPace(1) <= MAX_TEMPO);
  assert.equal(strollPace(5), WALK_SPEED);
  // no measured clip (wheelchair): the brisk pace as before
  assert.equal(strollPace(undefined), WALK_SPEED);
  assert.equal(strollPace(0), WALK_SPEED);
});

test("a short click trip strolls, a long one hurries and settles near the end", () => {
  const s = createPace(1);
  for (let i = 0; i < 60; i++)
    stepPace(s, { ...idle, remaining: HURRY_DISTANCE - 1 }, 1 / 30);
  assert.equal(s.pace, strollPace(1));
  for (let i = 0; i < 60; i++)
    stepPace(s, { ...idle, remaining: HURRY_DISTANCE + 5 }, 1 / 30);
  assert.equal(s.pace, WALK_SPEED);
  // still hurrying a little inside the start distance (hysteresis)...
  stepPace(s, { ...idle, remaining: HURRY_DISTANCE - 1 }, 1 / 30);
  assert.equal(s.hurry, true);
  // ...and back to a stroll for the last few meters
  for (let i = 0; i < 60; i++)
    stepPace(s, { ...idle, remaining: SLOW_DISTANCE - 0.5 }, 1 / 30);
  assert.equal(s.pace, strollPace(1));
});

test("held keys or stick start a stroll and hurry after a moment", () => {
  const s = createPace(1);
  stepPace(s, { ...idle, held: true }, HURRY_AFTER / 2);
  assert.equal(s.hurry, false);
  stepPace(s, { ...idle, held: true }, HURRY_AFTER);
  assert.equal(s.hurry, true);
  // letting go resets it
  stepPace(s, idle, 1 / 30);
  assert.equal(s.hurry, false);
  stepPace(s, { ...idle, held: true }, HURRY_AFTER / 2);
  assert.equal(s.hurry, false);
});

test("the pace ramps, never jumps", () => {
  const s = createPace(1);
  stepPace(s, { ...idle, remaining: 50 }, 1 / 60);
  const first = s.pace;
  assert.ok(first > strollPace(1) && first < WALK_SPEED, `${first}`);
  // from a stroll to the hurry takes well under a second
  let t = 1 / 60;
  while (s.pace < WALK_SPEED && t < 2) {
    stepPace(s, { ...idle, remaining: 50 }, 1 / 60);
    t += 1 / 60;
  }
  assert.ok(t < 1, `${t}s`);
});

test("changing style retargets the stroll; bad input is harmless", () => {
  const s = createPace(1);
  stepPace(s, { ...idle, clipSpeed: 1.5 }, 1);
  assert.equal(s.pace, strollPace(1.5));
  stepPace(s, { ...idle, remaining: Number.NaN, held: false }, Number.NaN);
  assert.ok(Number.isFinite(s.pace));
});
