import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeCook, ghostScore, outcome, parseCook } from "./cookOff.ts";
import { MAX_TIP, ORDER_POINTS, TICKETS } from "./orders.ts";

import { myStove } from "./cookOff.ts";
import { BLOCKERS, FLOOR, STOVES } from "./kamayanHall.ts";
import { pointInPolygon } from "./walk.ts";

test("the ghost cook's score is fixed by the seed and a fair fight", () => {
  for (const seed of [0, 1, 99, 123456]) {
    const g = ghostScore(seed);
    assert.equal(g, ghostScore(seed));
    assert.ok(g >= 5 * ORDER_POINTS && g <= TICKETS * (ORDER_POINTS + MAX_TIP));
  }
});

test("highest score wins; level is a tie", () => {
  assert.equal(outcome(90, 80), "win");
  assert.equal(outcome(70, 80), "lose");
  assert.equal(outcome(80, 80), "tie");
});

test("cook-off messages over the relay round-trip and junk is refused", () => {
  for (const m of [
    { k: "cook-invite", seed: 42 },
    { k: "cook-accept", seed: 42 },
    { k: "cook-score", score: 87 },
    { k: "cook-stop" },
  ] as const)
    assert.deepEqual(parseCook(encodeCook(m)), m);
  for (const bad of [
    '{"k":"cook-score","score":-1}',
    '{"k":"cook-score","score":1e9}',
    '{"k":"cook-invite","seed":1.5}',
    '{"k":"pair-stop"}',
    "nope",
    "null",
  ])
    assert.equal(parseCook(bad), null, bad);
});

test("two cooks in a match take different stoves; alone, you take the first", () => {
  assert.equal(myStove("p-1", null), 0);
  assert.equal(myStove(null, "p-2"), 0);
  const a = myStove("p-abc", "p-xyz");
  const b = myStove("p-xyz", "p-abc");
  assert.notEqual(a, b);
});

test("both stoves stand on the floor, out of the way, with room to cook", () => {
  assert.equal(STOVES.length, 2);
  for (const stove of STOVES) {
    const [x, z] = stove.cook;
    assert.ok(pointInPolygon(FLOOR, [x, z]), "cook spot on the floor");
    for (const b of BLOCKERS)
      assert.ok(!pointInPolygon(b, [x, z]), "cook spot clear of blockers");
    // the stove itself blocks walkers
    assert.ok(BLOCKERS.some((b) => pointInPolygon(b, [stove.x, stove.z])));
  }
});
