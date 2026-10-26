import assert from "node:assert/strict";
import { test } from "node:test";
import { daylightAt, hourOf, laneTint, parseTimeFlag } from "./daylight.ts";

test("noon is full day: sun up, no neon, a blue sky", () => {
  const d = daylightAt(12);
  assert.equal(d.sun, 1);
  assert.equal(d.neon, 0);
  const [r, , b] = d.zenith;
  assert.ok(b > r, "a blue zenith");
});

test("midnight is night: no sun, the neon at full", () => {
  const d = daylightAt(0);
  assert.equal(d.sun, 0);
  assert.equal(d.neon, 1);
});

test("the evening glows gold, between day and night", () => {
  const d = daylightAt(19.5);
  assert.ok(d.golden > 0.6, `golden ${d.golden}`);
  assert.ok(d.sun > 0 && d.sun < 1);
  assert.ok(d.neon > 0 && d.neon < 1);
});

test("light changes smoothly through the whole day, and wraps at midnight", () => {
  let last = daylightAt(0);
  for (let m = 1; m <= 24 * 60; m++) {
    const d = daylightAt(m / 60);
    assert.ok(Math.abs(d.sun - last.sun) < 0.02, `jump at ${m} min`);
    assert.ok(Math.abs(d.neon - last.neon) < 0.02, `neon jump at ${m} min`);
    last = d;
  }
  assert.deepEqual(daylightAt(24), daylightAt(0));
});

test("the sun rises in the east, peaks at noon and sets in the west", () => {
  assert.ok(daylightAt(12).sunElevation > daylightAt(9).sunElevation);
  assert.ok(daylightAt(9).sunDirection[0] > 0, "morning sun in the east (+x)");
  assert.ok(daylightAt(16).sunDirection[0] < 0, "afternoon sun in the west");
});

test("the hour comes from the local clock, or ?time=HH:MM for screenshots", () => {
  assert.equal(hourOf(new Date(2026, 9, 26, 14, 30)), 14.5);
  assert.equal(parseTimeFlag("?time=21:15"), 21.25);
  assert.equal(parseTimeFlag("?time=8"), 8);
  assert.equal(parseTimeFlag("?time=25"), null);
  assert.equal(parseTimeFlag("?room=city"), null);
});

test("street paint is untinted by day and dim violet at night", () => {
  assert.deepEqual(laneTint(daylightAt(12).neon), [1, 1, 1]);
  const night = laneTint(daylightAt(23).neon);
  assert.ok(night[0] < 0.6 && night[2] > night[0], "dim and violet");
  assert.deepEqual(laneTint(5), laneTint(1));
});
