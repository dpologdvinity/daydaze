// The dev panel's live hour pin: it overrides the city hour and the band's
// day clock, and letting go hands both back to ?time= or the real clock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cityHour, devDaySeconds, setDevHour } from "./daylight.ts";

test("a dev hour pins the city hour and runs the day clock on from it", () => {
  setDevHour(21.5);
  assert.equal(cityHour(), 21.5);
  const seconds = devDaySeconds();
  assert.ok(seconds !== null && seconds >= 21.5 * 3600);
  assert.ok(seconds !== null && seconds < 21.5 * 3600 + 5);
  setDevHour(null);
  assert.equal(devDaySeconds(), null);
  const hour = cityHour();
  assert.equal(typeof hour, "number");
  assert.ok(hour >= 0 && hour <= 24);
});
