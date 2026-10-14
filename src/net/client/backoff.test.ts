import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DELAY_MS, nextDelay } from "./backoff.ts";

const middle = () => 0.5;

test("delays double from 1 s and cap at 15 s", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 20].map((attempt) => nextDelay(attempt, middle)),
    [1000, 2000, 4000, 8000, 15_000, 15_000, 15_000],
  );
});

test("jitter spreads each delay by ±20% but never past the cap", () => {
  assert.equal(
    nextDelay(1, () => 0),
    1600,
  );
  assert.equal(
    nextDelay(1, () => 0.999999),
    2400,
  );
  assert.equal(
    nextDelay(4, () => 0),
    12_000,
  );
  assert.equal(
    nextDelay(4, () => 0.999999),
    MAX_DELAY_MS,
  );
});

test("bad attempts and randoms still give a delay in range", () => {
  for (const attempt of [-1, NaN, Infinity, 1.5])
    for (const random of [() => NaN, () => -1, () => 2, middle]) {
      const delay = nextDelay(attempt, random);
      assert.ok(
        delay >= 800 && delay <= MAX_DELAY_MS,
        `${attempt} -> ${delay}`,
      );
    }
});
