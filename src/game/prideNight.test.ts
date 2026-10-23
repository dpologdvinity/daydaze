import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nextPrideNightIn,
  PRIDE_CLUBS,
  PRIDE_EVERY,
  PRIDE_SECONDS,
  prideNightOn,
} from "./prideNight.ts";

test("Pride night runs for a while each cycle, the same for everyone", () => {
  assert.equal(prideNightOn(0), true);
  assert.equal(prideNightOn(PRIDE_SECONDS - 1), true);
  assert.equal(prideNightOn(PRIDE_SECONDS), false);
  assert.equal(prideNightOn(PRIDE_EVERY + 5), true);
  assert.equal(nextPrideNightIn(10), 0);
  assert.equal(nextPrideNightIn(PRIDE_EVERY - 30), 30);
});

test("it's on at the clubs, not everywhere", () => {
  assert.ok(PRIDE_CLUBS.has("pulse"));
  assert.ok(PRIDE_CLUBS.has("sugar-rush"));
  assert.ok(!PRIDE_CLUBS.has("plaza"));
});
