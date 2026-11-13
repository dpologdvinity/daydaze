// Dolls on one dance clip share a place in the loop: the same at any instant,
// advancing in step, anchored to the beat clock when there is one.

import assert from "node:assert/strict";
import { test } from "node:test";
import { syncOffset } from "./sync.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("two dolls starting at the same instant take the same place in the loop", () => {
  for (const period of [0.8333, 2.2, 5.3333])
    assert.equal(
      syncOffset(1234.5, null, period),
      syncOffset(1234.5, null, period),
    );
});

test("a doll that starts later is where the loop has got to, not back at the start", () => {
  const period = 2.2667;
  const first = syncOffset(100, null, period);
  const later = syncOffset(107.3, null, period);
  assert.ok(close((first + 7.3) % period, later));
});

test("with a tempo, the loop's first frame falls on the track's first beat and each turn after", () => {
  const tempo = { bpm: 120, startedAt: 40.25 };
  assert.ok(close(syncOffset(40.25, tempo, 2), 0));
  assert.ok(close(syncOffset(40.25 + 6, tempo, 2), 0));
  assert.ok(close(syncOffset(40.25 + 0.5, tempo, 2), 0.5));
});

test("the offset stays inside the loop, also before the track's first beat", () => {
  const tempo = { bpm: 128, startedAt: 10 };
  for (const now of [0, 9.9, 10, 10.1, 5000.77]) {
    const o = syncOffset(now, tempo, 3.1667);
    assert.ok(o >= 0 && o < 3.1667, `${now}: ${o}`);
  }
  assert.ok(close(syncOffset(9, tempo, 2), 1));
});

test("a loop with no length starts at its first frame", () => {
  assert.equal(syncOffset(55, null, 0), 0);
});
