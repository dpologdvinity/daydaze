import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "./duration.ts";
test("formats", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(5_000), "0:05");
  assert.equal(formatDuration(65_000), "1:05");
  assert.equal(formatDuration(59_999), "0:59");
  assert.equal(formatDuration(3_600_000), "1:00:00");
  assert.equal(formatDuration(3_661_000), "1:01:01");
  assert.equal(formatDuration(-5), "0:00");
  assert.equal(formatDuration(Number.NaN), "0:00");
  assert.equal(formatDuration(Infinity), "0:00");
});
