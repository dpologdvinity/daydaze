import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addHit,
  addTea,
  BREATHE_AMOUNT,
  decay,
  HIGH_DECAY_SECONDS,
  highParams,
} from "./high.ts";

test("hits and tea raise their meters up to 1", () => {
  assert.equal(addHit(0, "joint"), 0.35);
  assert.equal(addHit(0.9, "edible"), 1);
  assert.equal(addTea(0), 0.45);
  assert.equal(addTea(NaN), 0.45);
});

test("both meters fade over time and never go negative", () => {
  const later = decay(1, HIGH_DECAY_SECONDS, HIGH_DECAY_SECONDS);
  assert.ok(Math.abs(later - Math.exp(-1)) < 1e-9);
  assert.equal(decay(0.5, -10, 100), 0.5);
  assert.equal(decay(-1, 10, 100), 0);
});

test("the trip breathes and cycles color; reduced motion keeps only color", () => {
  const full = highParams(0, 1, 1, false);
  assert.equal(full.breathe, BREATHE_AMOUNT);
  assert.equal(full.hue, 1);
  const calm = highParams(0, 1, 1, true);
  assert.equal(calm.breathe, 0);
  assert.equal(calm.hue, 1);
  assert.equal(calm.drift, 0);
  assert.deepEqual(highParams(1, 1, 0, false), {
    glow: 0,
    hue: 0,
    breathe: 0,
    drift: 1,
  });
});
