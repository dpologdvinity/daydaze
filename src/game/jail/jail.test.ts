import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_JAIL,
  GOOD_BEHAVIOUR_MS,
  bailCost,
  bailOut,
  goodBehaviour,
  isJailed,
  remainingMs,
  sentence,
  validateJail,
} from "./jail.ts";

const NOW = 1_000_000;

test("a sentence counts down from the wall clock", () => {
  const jail = sentence(NOW, 3);
  assert.equal(remainingMs(jail, NOW), 180_000);
  assert.equal(remainingMs(jail, NOW + 60_000), 120_000);
  assert.equal(isJailed(jail, NOW + 180_000), false);
});

test("a free player is not jailed and owes no bail", () => {
  assert.equal(isJailed(DEFAULT_JAIL, NOW), false);
  assert.equal(bailCost(DEFAULT_JAIL, NOW), 0);
});

test("the sentence end time survives a save round trip", () => {
  const jail = sentence(NOW, 2);
  assert.deepEqual(validateJail(JSON.parse(JSON.stringify(jail))), jail);
});

test("bail costs more the more time is left", () => {
  const short = bailCost(sentence(NOW, 1), NOW);
  const long = bailCost(sentence(NOW, 5), NOW);
  assert.ok(long > short);
  assert.ok(short > 0);
});

test("good behaviour shortens the sentence and never goes below release", () => {
  const jail = sentence(NOW, 1);
  const cut = goodBehaviour(jail, NOW);
  assert.equal(remainingMs(cut, NOW), 60_000 - GOOD_BEHAVIOUR_MS);
  assert.equal(goodBehaviour({ endsAt: NOW + 5_000 }, NOW).endsAt, null);
  assert.equal(goodBehaviour(DEFAULT_JAIL, NOW), DEFAULT_JAIL);
});

test("bail cannot be paid until a coin wallet exists", () => {
  const jail = sentence(NOW, 2);
  assert.equal(bailOut(jail, NOW), null);
  assert.deepEqual(bailOut(DEFAULT_JAIL, NOW), DEFAULT_JAIL);
});

test("saved jail data that is not a finite time is dropped", () => {
  assert.deepEqual(validateJail(undefined), DEFAULT_JAIL);
  assert.deepEqual(validateJail({ endsAt: "soon" }), DEFAULT_JAIL);
  assert.deepEqual(validateJail({ endsAt: Infinity }), DEFAULT_JAIL);
});
