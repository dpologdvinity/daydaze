import assert from "node:assert/strict";
import { test } from "node:test";
import { deal, playable } from "./crazyEights.ts";
import { applyMove, encodeDuel, parseDuel } from "./duel.ts";

test("duel messages round trip, and anything off is dropped", () => {
  for (const m of [
    { k: "invite", seed: 42 },
    { k: "accept", seed: 42 },
    { k: "decline" },
    { k: "play", n: 3, i: 2, s: 1 },
    { k: "play", n: 0, i: 0 },
    { k: "draw", n: 7 },
    { k: "quit" },
  ] as const)
    assert.deepEqual(parseDuel(encodeDuel(m)), m);
  for (const bad of [
    "nope",
    "null",
    '{"k":"play","n":1,"i":-1}',
    '{"k":"play","n":1,"i":0,"s":4}',
    '{"k":"invite","seed":1.5}',
    '{"k":"steal"}',
  ])
    assert.equal(parseDuel(bad), null, bad);
});

test("both players' tables agree move for move, and turns are kept", () => {
  const a = deal(99);
  const i = a.you.findIndex((c) => playable(a, c));
  const move =
    i >= 0 ? { k: "play" as const, n: 0, i } : { k: "draw" as const, n: 0 };
  // the guest can't move on the dealer's turn
  assert.equal(applyMove(a, "guard", move), a);
  const after = applyMove(a, "you", move);
  assert.notEqual(after, a);
  assert.equal(after.turn, "guard");
  assert.deepEqual(applyMove(deal(99), "you", move), after);
});
