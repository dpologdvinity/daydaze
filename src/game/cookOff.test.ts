import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeCook, ghostScore, outcome, parseCook } from "./cookOff.ts";
import { MAX_TIP, ORDER_POINTS, TICKETS } from "./orders.ts";

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
