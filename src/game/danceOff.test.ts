import assert from "node:assert/strict";
import test from "node:test";
import {
  DANCE_OFF_EVERY,
  DANCE_OFF_SECONDS,
  danceOffAt,
  danceOffIndex,
} from "./danceOff.ts";

test("a dance-off runs for its half minute, then counts down to the next", () => {
  const t0 = DANCE_OFF_EVERY * 10;
  assert.deepEqual(danceOffAt(t0 + 5), {
    on: true,
    left: DANCE_OFF_SECONDS - 5,
  });
  assert.deepEqual(danceOffAt(t0 + DANCE_OFF_SECONDS), {
    on: false,
    startsIn: DANCE_OFF_EVERY - DANCE_OFF_SECONDS,
  });
  assert.equal(danceOffIndex(t0 + 5), danceOffIndex(t0 + DANCE_OFF_EVERY - 1));
  assert.equal(danceOffIndex(t0 + DANCE_OFF_EVERY), danceOffIndex(t0) + 1);
});
