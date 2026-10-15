import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_TRAITS,
  DEFAULT_BODY,
  bodyScales,
  cleanBody,
  clampTrait,
} from "./body.ts";

test("the default body sits in the middle of every slider", () => {
  for (const trait of BODY_TRAITS) assert.equal(DEFAULT_BODY[trait], 50);
});

test("slider values clamp to 0 to 100 in whole steps", () => {
  assert.equal(clampTrait(-10), 0);
  assert.equal(clampTrait(150), 100);
  assert.equal(clampTrait(42.6), 43);
  assert.equal(clampTrait(Number.NaN), 50);
});

test("a saved body keeps valid traits and resets the rest", () => {
  assert.deepEqual(
    cleanBody({ bust: 80, hips: "big", waist: 0, height: 101 }),
    { bust: 80, hips: 50, waist: 0, height: 50 },
  );
  assert.deepEqual(cleanBody(undefined), DEFAULT_BODY);
  assert.deepEqual(cleanBody([]), DEFAULT_BODY);
});

test("the default body is the identity scale", () => {
  const scales = bodyScales(DEFAULT_BODY);
  for (const value of Object.values(scales)) {
    assert.ok(Math.abs(value - 1) < 0.01, String(value));
  }
});

test("every trait stays within a doll-sized range, clothed or not", () => {
  for (const trait of BODY_TRAITS) {
    const low = bodyScales({ ...DEFAULT_BODY, [trait]: 0 });
    const high = bodyScales({ ...DEFAULT_BODY, [trait]: 100 });
    assert.ok(low[trait] >= 0.9 && low[trait] <= 1.1, `${trait} low`);
    assert.ok(high[trait] >= 0.9 && high[trait] <= 1.1, `${trait} high`);
    assert.ok(high[trait] > low[trait], `${trait} grows with its slider`);
  }
});
