// The street event clock: it runs on rendered frames, so walker reactions and
// get-ups honor ?timescale and a single long frame cannot end a knockdown
// before any frame has drawn it (issue #373).
import assert from "node:assert/strict";
import { test } from "node:test";
import { wallSeconds } from "../../game/clock.ts";
import {
  resetStreetClock,
  streetSeconds,
  tickStreetClock,
} from "./streetHits.ts";

test("streetSeconds returns wallSeconds when scale is 1", () => {
  resetStreetClock();
  const before = wallSeconds();
  const now = streetSeconds(1);
  const after = wallSeconds();
  assert.ok(now >= before && now <= after);
  tickStreetClock(10, 1);
  assert.ok(Math.abs(streetSeconds(1) - wallSeconds()) < 0.1);
});

test("tickStreetClock advances by dt * scale and caps long frames", () => {
  resetStreetClock();
  const start = streetSeconds(0.05);
  // normal 60 Hz frame (1/60 ≈ 0.0167 s): advances by dt * 0.05
  tickStreetClock(0.02, 0.05);
  const t1 = streetSeconds(0.05);
  assert.ok(Math.abs(t1 - (start + 0.02 * 0.05)) < 1e-6);

  // long cold frame of 5 seconds: capped at 0.25 s * 0.05 = 0.0125 s
  tickStreetClock(5, 0.05);
  const t2 = streetSeconds(0.05);
  assert.ok(Math.abs(t2 - (t1 + 0.25 * 0.05)) < 1e-6);

  resetStreetClock();
});
