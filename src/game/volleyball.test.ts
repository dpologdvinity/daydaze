import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ballSeconds,
  matchOver,
  NEW_RALLY,
  play,
  TO_WIN,
  type Rally,
} from "./volleyball.ts";

test("a dig, then a perfect spike, is your point", () => {
  let m: Rally = NEW_RALLY;
  ({ match: m } = play(m, "good"));
  assert.equal(m.touch, "spike");
  const r = play(m, "perfect");
  assert.equal(r.outcome, "kill");
  assert.deepEqual([r.match.you, r.match.them, r.match.touch], [1, 0, "dig"]);
});

test("a missed dig or a spike into the net is theirs", () => {
  assert.equal(play(NEW_RALLY, "late").match.them, 1);
  const spike = play(NEW_RALLY, "perfect").match;
  const r = play(spike, "early");
  assert.equal(r.outcome, "lost");
  assert.equal(r.match.them, 1);
});

test("a good spike gets dug: the rally goes on, quicker", () => {
  const spike = play(NEW_RALLY, "perfect").match;
  const r = play(spike, "good");
  assert.equal(r.outcome, "rally");
  assert.equal(r.match.rally, 1);
  assert.equal(r.match.touch, "dig");
  assert.ok(ballSeconds(r.match) < ballSeconds(NEW_RALLY));
});

test("first to seven takes the match, and nothing plays after", () => {
  let m: Rally = NEW_RALLY;
  for (let i = 0; i < TO_WIN; i++) {
    m = play(m, "good").match;
    m = play(m, "perfect").match;
  }
  assert.equal(m.you, TO_WIN);
  assert.ok(matchOver(m));
  assert.equal(play(m, "perfect").match, m);
});
