// Tests for the event clocks: a held clock waits for its release, a shifted
// clock runs from its first read.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clockSynced,
  heldClock,
  resetServerClock,
  secondsSince,
  shiftedClock,
  syncServerClock,
  toNextStart,
  wallSeconds,
} from "./clock.ts";

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

test("heldClock can hold at an explicit slot", () => {
  const wall = fakeNow(1_000);
  const clock = heldClock(300, 5, wall.now, 1005);
  assert.equal(clock.read(), 300 * 1005 + 5);
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

test("toNextStart moves a clock to the start of an event's next run", () => {
  assert.equal(toNextStart(1_000, 240), 200); // 1000 % 240 = 40 in
  assert.equal((1_000 + toNextStart(1_000, 240)) % 240, 0);
  assert.equal(toNextStart(960, 240), 0); // a run starting right now
  assert.equal(toNextStart(-10, 240), 10); // negative times wrap the same way
});

test("secondsSince drops float jitter from large wall-clock bases", () => {
  const start = 2_400_000;
  assert.notEqual(start + 74.9 - start, 74.9); // the raw subtraction jitters
  assert.equal(secondsSince(start + 74.9, start), 74.9);
  assert.equal(secondsSince(start - 3.25, start), -3.25);
});

test("the wall clock is the device's own until a server time arrives", () => {
  resetServerClock();
  assert.equal(clockSynced(), false);
  assert.ok(Math.abs(wallSeconds() - Date.now() / 1000) < 0.05);
});

test("a server time moves the wall clock onto the server's, and syncs it", () => {
  const local = 1_700_000_000_000;
  resetServerClock();
  // this device runs a minute behind the server
  syncServerClock(local + 60_000, local);
  assert.equal(clockSynced(), true);
  const now = Date.now();
  assert.ok(Math.abs(wallSeconds() - (now + 60_000) / 1000) < 0.05);
  resetServerClock();
  assert.equal(clockSynced(), false);
});

test("later server times move the clock only past the jitter threshold", () => {
  const local = 1_700_000_000_000;
  resetServerClock();
  syncServerClock(local + 1_000, local);
  const first = wallSeconds();
  // 100 ms of network jitter: the clock keeps its offset
  syncServerClock(local + 1_100, local);
  assert.ok(Math.abs(wallSeconds() - first) < 0.05);
  // a real correction (the device clock was stepped): the clock follows
  syncServerClock(local + 5_000, local);
  assert.ok(wallSeconds() - first > 3.9);
  resetServerClock();
});

test("server times that are not finite numbers are ignored", () => {
  resetServerClock();
  for (const bad of [Number.NaN, Infinity, -Infinity, 8.7e15, -1])
    syncServerClock(bad, 1_700_000_000_000);
  assert.equal(clockSynced(), false);
});
