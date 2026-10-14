import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TICKS_PER_FRAME, TICK_HZ, advance } from "./fixedStep.ts";

const TICK = 1 / TICK_HZ;

test("advance runs one step per whole tick and returns the leftover fraction", () => {
  const clock = { accumulator: 0 };
  let ticks = 0;
  const alpha = advance(clock, 0.05, () => ticks++);
  assert.equal(ticks, 2);
  assert.ok(Math.abs(clock.accumulator - 0.01) < 1e-9);
  assert.ok(Math.abs(alpha - 0.5) < 1e-9);
});

test("a huge frame gap runs at most MAX_TICKS_PER_FRAME steps and drops the rest", () => {
  const clock = { accumulator: 0 };
  let ticks = 0;
  const alpha = advance(clock, 10, () => ticks++);
  assert.equal(ticks, MAX_TICKS_PER_FRAME);
  assert.ok(clock.accumulator < TICK);
  assert.ok(alpha >= 0 && alpha < 1);
});

test("negative and NaN frame times run no steps; infinity is capped", () => {
  for (const dt of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const clock = { accumulator: 0 };
    let ticks = 0;
    const alpha = advance(clock, dt, () => ticks++);
    assert.equal(
      ticks,
      dt === Number.POSITIVE_INFINITY ? MAX_TICKS_PER_FRAME : 0,
    );
    assert.ok(Number.isFinite(alpha));
  }
});
