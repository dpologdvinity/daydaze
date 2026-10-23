import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fishAt,
  paradeSeconds,
  roundOf,
  ROUNDS,
  scoreAnswer,
} from "./reefSpotter.ts";

test("rounds get longer and quicker, and the count is right", () => {
  const first = roundOf(5, 0);
  const last = roundOf(5, ROUNDS - 1);
  assert.ok(last.parade.length > first.parade.length);
  assert.ok(last.each < first.each);
  for (let r = 0; r < ROUNDS; r++) {
    const round = roundOf(5, r);
    assert.ok(round.count >= 1);
    assert.equal(
      round.count,
      round.parade.filter((f) => f === round.ask).length,
    );
  }
  assert.deepEqual(roundOf(5, 2), roundOf(5, 2));
});

test("the window shows one fish at a time, and answers score by closeness", () => {
  const round = roundOf(9, 0);
  assert.equal(fishAt(round, 0), round.parade[0]);
  assert.equal(fishAt(round, round.each * 1.5), round.parade[1]);
  assert.equal(fishAt(round, paradeSeconds(round) + 0.01), null);
  assert.equal(scoreAnswer(round, round.count), 20);
  assert.equal(scoreAnswer(round, round.count + 1), 8);
  assert.equal(scoreAnswer(round, round.count + 3), 0);
});
