import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dive,
  DIVES,
  entryAt,
  entryOf,
  gameOver,
  newDives,
  total,
  TRICKS,
} from "./cliffDive.ts";

test("entries grade from a rip to a belly flop by distance from the middle", () => {
  assert.equal(entryOf(0.5), "rip");
  assert.equal(entryOf(0.6), "clean");
  assert.equal(entryOf(0.75), "splash");
  assert.equal(entryOf(0.02), "flop");
});

test("harder tricks pay more for the same entry, and a flop pays nothing", () => {
  const easy = dive(newDives(), "pencil", 0.5);
  const hard = dive(newDives(), "twist", 0.5);
  assert.ok(total(hard) > total(easy));
  assert.equal(total(dive(newDives(), "twist", 0)), 0);
});

test("the entry meter sweeps 0..1, faster on harder tricks", () => {
  for (const t of [0, 0.3, 1.7, 9])
    for (const trick of TRICKS) {
      const v = entryAt(trick.id, t);
      assert.ok(v >= 0 && v <= 1);
    }
  // after a short beat the twist's meter has moved further than the pencil's
  assert.ok(entryAt("twist", 0.2) > entryAt("pencil", 0.2));
});

test("five dives make a set, and nothing counts after", () => {
  let g = newDives();
  for (let i = 0; i < DIVES; i++) g = dive(g, "swan", 0.5);
  assert.ok(gameOver(g));
  assert.equal(dive(g, "swan", 0.5), g);
});
