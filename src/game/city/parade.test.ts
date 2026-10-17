import assert from "node:assert/strict";
import test from "node:test";
import {
  FLOAT_GAP,
  FLOATS,
  floatX,
  nextParadeIn,
  PARADE_EVERY,
  PARADE_FROM,
  PARADE_SECONDS,
  PARADE_TO,
  paradeOn,
} from "./parade.ts";

test("the parade fits in its slot, with time before the next", () => {
  assert.ok(PARADE_SECONDS < PARADE_EVERY);
});

test("floats set off one after another and roll east to the end", () => {
  const t0 = PARADE_EVERY * 20;
  assert.equal(floatX(t0, 0), PARADE_FROM);
  assert.equal(floatX(t0, 1), null);
  const mid = floatX(t0 + 40, 0);
  const behind = floatX(t0 + 40, 1);
  assert.ok(mid !== null && behind !== null);
  assert.equal(mid - behind, FLOAT_GAP);
  assert.equal(floatX(t0 + PARADE_SECONDS + 1, FLOATS - 1), null);
  for (let s = 0; s < PARADE_SECONDS; s += 3)
    for (let k = 0; k < FLOATS; k++) {
      const x = floatX(t0 + s, k);
      if (x !== null) assert.ok(x >= PARADE_FROM && x <= PARADE_TO);
    }
});

test("the countdown reads 0 during the parade and runs to the next", () => {
  const t0 = PARADE_EVERY * 3;
  assert.equal(paradeOn(t0 + 10), true);
  assert.equal(nextParadeIn(t0 + 10), 0);
  assert.equal(nextParadeIn(t0 + PARADE_EVERY - 5), 5);
});
