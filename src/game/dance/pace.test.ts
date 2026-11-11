import assert from "node:assert/strict";
import { test } from "node:test";
import { WALK_SPEED } from "../walk.ts";
import { MAX_TEMPO } from "./stride.ts";
import {
  HURRY_AFTER,
  HURRY_DISTANCE,
  SLOW_DISTANCE,
  hurryDistance,
  slowDistance,
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
    stepPace(s, { ...idle, remaining: hurryDistance(1) - 1 }, 1 / 30);
  assert.equal(s.pace, strollPace(1));
  for (let i = 0; i < 60; i++)
    stepPace(s, { ...idle, remaining: hurryDistance(1) + 5 }, 1 / 30);
  assert.equal(s.pace, WALK_SPEED);
  // still hurrying a little inside the start distance (hysteresis)...
  stepPace(s, { ...idle, remaining: hurryDistance(1) - 1 }, 1 / 30);
  assert.equal(s.hurry, true);
  // ...and back to a stroll for the last few meters
  for (let i = 0; i < 60; i++)
    stepPace(s, { ...idle, remaining: slowDistance(1) - 0.5 }, 1 / 30);
  assert.equal(s.pace, strollPace(1));
});

test("a slow style hurries sooner, a quick one strolls farther, none past the cap", () => {
  // "careful" (0.277 m/s clip) strolls about a meter, then hurries
  assert.ok(hurryDistance(0.277) > 0.8 && hurryDistance(0.277) < 1.2);
  const careful = createPace(0.277);
  stepPace(careful, { clipSpeed: 0.277, remaining: 3, held: false }, 1 / 30);
  assert.equal(careful.hurry, true);
  stepPace(careful, { clipSpeed: 0.277, remaining: 0.2, held: false }, 1 / 30);
  assert.equal(careful.hurry, false);
  // "feminine" (1.54 m/s clip) strolls up to about 5.5 m
  assert.ok(Math.abs(hurryDistance(1.54) - 5.5) < 0.1);
  const feminine = createPace(1.54);
  stepPace(feminine, { clipSpeed: 1.54, remaining: 5, held: false }, 1 / 30);
  assert.equal(feminine.hurry, false);
  stepPace(feminine, { clipSpeed: 1.54, remaining: 6, held: false }, 1 / 30);
  assert.equal(feminine.hurry, true);
  // the fastest strolls stay under the caps, and the hysteresis never inverts
  for (const c of [0.277, 0.9, 1.54, 5, undefined]) {
    assert.ok(hurryDistance(c) <= HURRY_DISTANCE);
    assert.ok(slowDistance(c) <= SLOW_DISTANCE);
    assert.ok(slowDistance(c) < hurryDistance(c));
  }
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
