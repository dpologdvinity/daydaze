import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_COINS, earn, isCoins, payoutFor, spend } from "./wallet.ts";

test("better minigame grades pay more", () => {
  assert.ok(payoutFor("S") > payoutFor("A"));
  assert.ok(payoutFor("A") > payoutFor("B"));
  assert.ok(payoutFor("B") > payoutFor("C"));
  assert.ok(payoutFor("C") > 0);
});

test("earning never passes the cap", () => {
  assert.equal(earn(10, 5), 15);
  assert.equal(earn(MAX_COINS - 1, 40), MAX_COINS);
});

test("spending returns the new balance only when it is covered", () => {
  assert.equal(spend(30, 30), 0);
  assert.equal(spend(29, 30), null);
  assert.equal(spend(0, 1), null);
});

test("only whole, in-range amounts are coins", () => {
  assert.equal(isCoins(0), true);
  assert.equal(isCoins(MAX_COINS), true);
  for (const bad of [-1, 1.5, NaN, Infinity, MAX_COINS + 1, "5", null]) {
    assert.equal(isCoins(bad), false, String(bad));
  }
});
