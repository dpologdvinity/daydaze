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
