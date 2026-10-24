import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BENDS,
  bendAt,
  finishTenths,
  rivalTenths,
  runOver,
  tuck,
  type Run,
  bendFraction,
  rivalRideSeconds,
  RIDE_SECONDS,
  slideProgress,
} from "./speedSlide.ts";

test("perfect tucks at every bend beat any rival; missing them all loses", () => {
  let fast: Run = [];
  let slow: Run = [];
  for (let i = 0; i < BENDS; i++) {
    fast = tuck(fast, "perfect");
    slow = tuck(slow, "late");
  }
  for (const seed of [1, 2, 3, 4, 5]) {
    assert.ok(finishTenths(fast) < rivalTenths(seed));
    assert.ok(finishTenths(slow) > rivalTenths(seed));
  }
});

test("bends come one after another, and the run ends after the last", () => {
  assert.ok(bendAt(1) > bendAt(0));
  let run: Run = [];
  for (let i = 0; i < BENDS; i++) run = tuck(run, "good");
  assert.ok(runOver(run));
  assert.equal(tuck(run, "perfect"), run);
});

test("each bend sits along the slide where the race clock reaches it", () => {
  let last = 0;
  for (let i = 0; i < BENDS; i++) {
    const f = bendFraction(i);
    assert.ok(f > last && f < 1, `bend ${i} at ${f}`);
    assert.ok(Math.abs(slideProgress(bendAt(i)) - f) < 1e-12);
    last = f;
  }
  // the run-out after the last bend takes the rider into the pool
  assert.ok(1 - bendFraction(BENDS - 1) > 0.05);
});

test("the ride runs from the top at push-off to the splash at the end", () => {
  assert.equal(slideProgress(-1), 0);
  assert.equal(slideProgress(0), 0);
  assert.equal(slideProgress(RIDE_SECONDS), 1);
  assert.equal(slideProgress(RIDE_SECONDS + 5), 1);
});

test("the rival rides slower than you when you're beating her, faster if not", () => {
  const rival = rivalTenths(42);
  assert.ok(rivalRideSeconds(rival, rival - 10) > RIDE_SECONDS);
  assert.ok(rivalRideSeconds(rival, rival + 10) < RIDE_SECONDS);
  assert.equal(rivalRideSeconds(rival, rival), RIDE_SECONDS);
  // a run with no tucks yet projects the untucked time
  assert.equal(finishTenths([]), 120);
});
