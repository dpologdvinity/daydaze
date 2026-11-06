import assert from "node:assert/strict";
import { test } from "node:test";
import type { BandEvent } from "../game/city/bandTunes.ts";
import { LOOKAHEAD, dueEvents } from "./parkBand.ts";

const ev = (beat: number): BandEvent => ({
  beat,
  part: "kick",
  midi: [],
  beats: 0,
});

test("dueEvents hands over the next slice of a tune, once", () => {
  const events = [0, 1, 2, 3, 4].map(ev);
  // half-second beats: at 0 s the beats at 0 and 0.5 s are due (before 0.6 s)
  const first = dueEvents(events, 0.5, 0, 0);
  assert.deepEqual(
    first.due.map((d) => d.event.beat),
    [0, 1],
  );
  assert.equal(first.due[1].delay, 0.5);
  assert.equal(first.cursor, 2);
  // the next call, 0.4 s on, schedules the beats not yet handed over
  const second = dueEvents(events, 0.5, first.cursor, 0.5);
  assert.deepEqual(
    second.due.map((d) => d.event.beat),
    [2],
  );
  assert.ok(second.due[0].delay === 0.5 && 0.5 < LOOKAHEAD + 0.5);
  assert.equal(second.cursor, 3);
});

test("dueEvents skips what is already well past and stops at the end", () => {
  const events = [0, 1, 2].map(ev);
  const late = dueEvents(events, 0.5, 0, 0.9);
  // beats 0 (0 s) and 1 (0.5 s) are over; beat 2 (1 s) is due
  assert.deepEqual(
    late.due.map((d) => d.event.beat),
    [2],
  );
  assert.equal(dueEvents(events, 0.5, 3, 5).due.length, 0);
});
