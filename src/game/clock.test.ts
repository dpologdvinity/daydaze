// Tests for the event clocks: a held clock waits for its release, a shifted
// clock runs from its first read.

import { test } from "node:test";
import assert from "node:assert/strict";
import { heldClock, shiftedClock } from "./clock.ts";

/** A fake wall clock in seconds the test moves by hand. */
function fakeNow(start: number) {
  const clock = { t: start, now: () => clock.t };
  return clock;
}

test("a held clock stays put however much real time passes", () => {
  const wall = fakeNow(1_000);
  const clock = heldClock(300, 5, wall.now);
  const first = clock.read();
  wall.t += 120;
  assert.equal(clock.read(), first);
  assert.equal(((first % 300) + 300) % 300, 5);
});

test("a released held clock runs on from where it was held", () => {
  const wall = fakeNow(1_000);
  const clock = heldClock(300, 5, wall.now);
  const held = clock.read();
  wall.t += 60;
  clock.release();
  wall.t += 7;
  assert.equal(clock.read(), held + 7);
  clock.release(); // a second release changes nothing
  wall.t += 1;
  assert.equal(clock.read(), held + 8);
});

test("a shifted clock lands `into` seconds into an event, then advances", () => {
  const wall = fakeNow(1_234.5);
  const clock = shiftedClock(300, -20, wall.now);
  const first = clock.read();
  assert.equal(((first % 300) + 300) % 300, 280);
  wall.t += 3;
  assert.equal(clock.read(), first + 3);
});
