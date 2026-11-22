// Wanted level: crimes add heat, stars come from heat, heat cools off out of
// sight (faster when hiding), getting caught means jail, and bail reuses jail.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CRIMES,
  ESCAPE_XP,
  MAX_STARS,
  NOT_WANTED,
  RESPONSES,
  arrest,
  captureTime,
  commitCrime,
  payBail,
  responseFor,
  starsOf,
  stepWanted,
  validateWanted,
  type WantedState,
} from "./wanted.ts";
import { isJailed, remainingMs, sentence } from "../jail/jail.ts";

const NOW = 5_000_000;
const seen = { inSight: true, hiding: false };
const unseen = { inSight: false, hiding: false };
const hidden = { inSight: false, hiding: true };

test("a clean record has no stars", () => {
  assert.equal(starsOf(NOT_WANTED), 0);
});

test("crimes raise stars: shoplifting a little, a heist a lot", () => {
  const lift = commitCrime(NOT_WANTED, "shoplift");
  assert.equal(starsOf(lift.state), 2);
  const hit = commitCrime(NOT_WANTED, "hitAndRun");
  assert.ok(starsOf(hit.state) >= 2);
  const heist = commitCrime(NOT_WANTED, "heist");
  assert.ok(starsOf(heist.state) >= 4);
  assert.ok(CRIMES.heist.heat > CRIMES.streetFight.heat);
});

test("hitting someone with your car is a star; driving off makes it worse", () => {
  const hit = commitCrime(NOT_WANTED, "pedestrianHit");
  assert.equal(starsOf(hit.state), 1);
  // no Street-ladder XP for running someone over
  assert.equal(hit.xp, 0);
  const ran = commitCrime(hit.state, "hitAndRun");
  assert.ok(starsOf(ran.state) >= 2);
});

test("crimes stack and stars cap at five", () => {
  let state: WantedState = NOT_WANTED;
  for (let i = 0; i < 20; i++) state = commitCrime(state, "heist").state;
  assert.equal(starsOf(state), MAX_STARS);
  const again = commitCrime(state, "heist").state;
  assert.equal(again.heat, state.heat);
});

test("a crime reports its XP and resets the unseen timers", () => {
  const first = stepWanted(
    commitCrime(NOT_WANTED, "heist").state,
    4000,
    hidden,
  );
  const result = commitCrime(first.state, "streetFight");
  assert.equal(result.xp, CRIMES.streetFight.xp);
  assert.equal(result.state.unseenMs, 0);
  assert.equal(result.state.hidingMs, 0);
});

test("heat does not cool while the police can see you", () => {
  const start = commitCrime(NOT_WANTED, "hitAndRun").state;
  const { state } = stepWanted(start, 60_000, seen);
  assert.equal(state.heat, start.heat);
});

test("out of sight, heat cools only after a search grace period", () => {
  const start = commitCrime(NOT_WANTED, "hitAndRun").state;
  const early = stepWanted(start, 1000, unseen).state;
  assert.equal(early.heat, start.heat);
  const late = stepWanted(start, 120_000, unseen).state;
  assert.ok(late.heat < start.heat);
});

test("hiding cools faster than just being out of sight", () => {
  const start = commitCrime(NOT_WANTED, "hitAndRun").state;
  const lying = stepWanted(start, 20_000, unseen).state;
  const hiding = stepWanted(start, 20_000, hidden).state;
  assert.ok(hiding.heat < lying.heat);
});

test("being spotted again restarts the search", () => {
  const start = commitCrime(NOT_WANTED, "hitAndRun").state;
  const lying = stepWanted(start, 20_000, unseen).state;
  assert.ok(lying.unseenMs > 0);
  assert.equal(stepWanted(lying, 100, seen).state.unseenMs, 0);
});

test("cooling to zero is an escape worth XP for the stars you had", () => {
  let state = commitCrime(NOT_WANTED, "hitAndRun").state;
  const stars = starsOf(state);
  let escapedXp = 0;
  for (let i = 0; i < 2000 && starsOf(state) > 0; i++) {
    const step = stepWanted(state, 1000, hidden);
    state = step.state;
    if (step.escape) escapedXp = step.escape.xp;
  }
  assert.equal(state.heat, 0);
  assert.equal(escapedXp, ESCAPE_XP[stars]);
  assert.ok(ESCAPE_XP[5] > ESCAPE_XP[1]);
});

test("an unwanted player never earns an escape", () => {
  const step = stepWanted(NOT_WANTED, 60_000, hidden);
  assert.equal(step.escape, null);
  assert.deepEqual(step.state, NOT_WANTED);
});

test("bad elapsed times change nothing", () => {
  const start = commitCrime(NOT_WANTED, "heist").state;
  assert.deepEqual(stepWanted(start, Number.NaN, hidden).state, start);
  assert.deepEqual(stepWanted(start, -5, hidden).state, start);
});

test("every star level has a response, and it only grows", () => {
  assert.equal(RESPONSES.length, MAX_STARS + 1);
  assert.equal(responseFor(0).officers, 0);
  assert.equal(responseFor(0).helicopters, 0);
  for (let s = 1; s <= MAX_STARS; s++) {
    const a = responseFor(s - 1);
    const b = responseFor(s);
    assert.ok(b.officers >= a.officers);
    assert.ok(b.cars >= a.cars);
    assert.ok(b.roadblocks >= a.roadblocks);
    assert.ok(b.helicopters >= a.helicopters);
    assert.ok(b.sightRadius >= a.sightRadius);
  }
  assert.equal(responseFor(1).helicopters, 0);
  assert.ok(responseFor(5).helicopters > 0);
  assert.ok(responseFor(3).roadblocks > 0);
});

test("responseFor clamps out-of-range stars", () => {
  assert.equal(responseFor(-3), RESPONSES[0]);
  assert.equal(responseFor(99), RESPONSES[MAX_STARS]);
  assert.equal(responseFor(Number.NaN), RESPONSES[0]);
});

test("being caught jails you longer at more stars and clears the stars", () => {
  const one = arrest(commitCrime(NOT_WANTED, "shoplift").state, NOW);
  const five = arrest(commitCrime(NOT_WANTED, "heist").state, NOW);
  assert.equal(one.wanted.heat, 0);
  assert.ok(isJailed(one.jail, NOW));
  assert.ok(remainingMs(five.jail, NOW) > remainingMs(one.jail, NOW));
  assert.ok(remainingMs(five.jail, NOW) <= 15 * 60_000);
});

test("being caught while not wanted is no arrest", () => {
  const result = arrest(NOT_WANTED, NOW);
  assert.equal(isJailed(result.jail, NOW), false);
});

test("bail frees you using the jail rules, or fails when broke", () => {
  const jail = sentence(NOW, 2);
  assert.equal(payBail(jail, NOW, 1), null);
  const paid = payBail(jail, NOW, 1000);
  assert.ok(paid);
  assert.equal(isJailed(paid.jail, NOW), false);
  assert.ok(paid.coins < 1000);
});

test("saved wanted state is untrusted", () => {
  assert.deepEqual(validateWanted(null), NOT_WANTED);
  assert.deepEqual(validateWanted({ heat: "x" }), NOT_WANTED);
  assert.deepEqual(validateWanted({ heat: -4, unseenMs: 1 }), NOT_WANTED);
  const big = validateWanted({ heat: 1e9, unseenMs: 5, hidingMs: Infinity });
  assert.equal(starsOf(big), MAX_STARS);
  assert.equal(big.hidingMs, 0);
});

test("a cruiser needs three uninterrupted seconds in reach of a stopped car", () => {
  assert.equal(captureTime(0, 2999, 3.5, 0.5, true), 2999);
  assert.equal(captureTime(2999, 1, 3.5, 0.5, true), 3000);
  assert.equal(captureTime(2999, 1, 3.51, 0.5, true), 0);
  assert.equal(captureTime(2999, 1, 3.5, -1, true), 0);
  assert.equal(captureTime(2999, 1, 3.5, 0, false), 0);
});

test("an officer catches a wanted player within reach on foot", () => {
  assert.equal(captureTime(0, 100, 2.5, null, true), 3000);
  assert.equal(captureTime(0, 100, 2.51, null, true), 0);
});
