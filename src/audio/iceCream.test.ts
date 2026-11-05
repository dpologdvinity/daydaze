// The truck jingle fades with distance and tolerates unavailable Web Audio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { jingleLevel, jingleNote, playIceCreamNote } from "./iceCream.ts";
test("jingle attenuation is bounded, monotone and silent beyond earshot", () => {
  assert.equal(jingleLevel(0), 0.08);
  assert.ok(jingleLevel(5) > jingleLevel(20));
  assert.ok(jingleLevel(20) > jingleLevel(40));
  for (const d of [60, 1000, NaN, Infinity, -1])
    assert.equal(jingleLevel(d), 0);
});
test("public-domain Twinkle Twinkle melody repeats with a rest between phrases", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((n) => jingleNote(n * 0.4)),
    [60, 60, 67, 67, 69, 69, 67],
  );
  assert.equal(jingleNote(2.8), null);
  assert.equal(jingleNote(6.4), jingleNote(0));
  assert.equal(playIceCreamNote(60, 0.05), false);
});
