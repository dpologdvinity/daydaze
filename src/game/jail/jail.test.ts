// Jail: sentences count down from the wall clock and survive a save, free players
// owe no bail, bail scales with time left, and good behavior shortens the term.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_JAIL,
  GOOD_BEHAVIOR_MS,
  bailCost,
  bailOut,
  goodBehavior,
  isJailed,
  jailAllowsTravel,
  remainingMs,
  rhythmService,
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

test("good behavior shortens the sentence and never goes below release", () => {
  const jail = sentence(NOW, 1);
  const cut = goodBehavior(jail, NOW);
  assert.equal(remainingMs(cut, NOW), 60_000 - GOOD_BEHAVIOR_MS);
  assert.equal(goodBehavior({ endsAt: NOW + 5_000 }, NOW).endsAt, null);
  assert.equal(goodBehavior(DEFAULT_JAIL, NOW), DEFAULT_JAIL);
});

test("bail is paid from the wallet or refused", () => {
  const jail = sentence(NOW, 2);
  const cost = bailCost(jail, NOW);
  assert.equal(bailOut(jail, NOW, cost - 1), null);
  assert.deepEqual(bailOut(jail, NOW, cost + 5), {
    jail: { endsAt: null },
    coins: 5,
  });
  assert.deepEqual(bailOut(DEFAULT_JAIL, NOW, 7), {
    jail: DEFAULT_JAIL,
    coins: 7,
  });
});

test("saved jail data that is not a finite time is dropped", () => {
  assert.deepEqual(validateJail(undefined), DEFAULT_JAIL);
  assert.deepEqual(validateJail({ endsAt: "soon" }), DEFAULT_JAIL);
  assert.deepEqual(validateJail({ endsAt: Infinity }), DEFAULT_JAIL);
});

test("a qualifying rhythm set takes a minute off the remaining sentence", () => {
  assert.deepEqual(rhythmService(sentence(NOW, 2), NOW, "B"), sentence(NOW, 1));
  assert.equal(rhythmService({ endsAt: NOW + 5000 }, NOW, "A").endsAt, null);
});

test("quitting or missing the rhythm set earns no time off", () => {
  const jail = sentence(NOW, 1);
  assert.equal(rhythmService(jail, NOW, null), jail);
  assert.equal(rhythmService(jail, NOW, "C"), jail);
});

test("an active sentence blocks travel out of jail until it ends", () => {
  const jail = sentence(NOW, 1);
  assert.equal(jailAllowsTravel(jail, NOW, "city"), false);
  assert.equal(jailAllowsTravel(jail, NOW, "jail"), true);
  assert.equal(jailAllowsTravel(jail, NOW + 60000, "city"), true);
  assert.equal(jailAllowsTravel(DEFAULT_JAIL, NOW, "city"), true);
});
