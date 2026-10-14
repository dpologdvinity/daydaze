import { test } from "node:test";
import assert from "node:assert/strict";
import { BUCKET_PRUNE_AFTER_MS, createAuthLimiter } from "./authLimits.ts";
import {
  BLOCK_ADDRESS_LIMIT,
  BLOCK_LIMIT,
  GUEST_LIMIT,
  LOGIN_ACCOUNT_LIMIT,
  LOGIN_ADDRESS_LIMIT,
  REPORT_ADDRESS_LIMIT,
  REPORT_LIMIT,
  SIGNUP_LIMIT,
} from "./rateLimit.ts";

test("the 6th rapid login for one account is refused with a retry time", () => {
  const limiter = createAuthLimiter();
  for (let i = 0; i < 5; i++) assert.equal(limiter.take("login", "kai", 0), 0);
  const retry = limiter.take("login", "kai", 0);
  assert.ok(retry >= 1 && retry <= 60, `${retry}`);
  // Another account from the same address still works.
  assert.equal(limiter.take("login", "sam", 0), 0);
  // And the account recovers with time.
  assert.equal(limiter.take("login", "kai", retry * 1000), 0);
});

test("login attempts across many accounts from one address are capped too", () => {
  const limiter = createAuthLimiter();
  let allowed = 0;
  for (let i = 0; i < 100; i++)
    if (limiter.take("login", `user${i}`, 0) === 0) allowed++;
  assert.equal(allowed, 20);
});

test("signups and guest sessions have their own budgets", () => {
  const limiter = createAuthLimiter();
  const run = (kind: "signup" | "guest", times: number) =>
    Array.from({ length: times }, () => limiter.take(kind, "", 0) === 0).filter(
      Boolean,
    ).length;
  assert.equal(run("signup", 10), 3);
  assert.equal(run("guest", 30), 10);
  assert.equal(limiter.take("login", "kai", 0), 0);
});

test("reports and blocks are limited per player, and more loosely per address", () => {
  const limiter = createAuthLimiter();
  const run = (
    kind: "report" | "block",
    scope: "player" | "address",
    times: number,
  ) =>
    Array.from(
      { length: times },
      () => limiter.take(kind, "", 0, scope) === 0,
    ).filter(Boolean).length;
  assert.equal(run("report", "player", 20), 5);
  assert.equal(run("block", "player", 50), 20);
  // A shared address (a household, a campus) gets a wider budget.
  assert.equal(run("report", "address", 50), 15);
  assert.equal(run("block", "address", 100), 60);
  assert.ok(limiter.take("report", "", 0, "player") >= 1);
  assert.equal(limiter.take("report", "", 60_000, "player"), 0);
});

test("auth budgets persist across instances that share a store", () => {
  const store = new Map<string, { tokens: number; at: number }>();
  const first = createAuthLimiter(store);
  for (let i = 0; i < 5; i++) first.take("login", "kai", 0);
  const second = createAuthLimiter(store);
  assert.ok(second.take("login", "kai", 0) >= 1);
  // Limiters share the store without sharing keys.
  assert.equal(second.take("login", "sam", 0), 0);
  assert.equal(second.take("guest", "", 0), 0);
  assert.ok([...store.keys()].every((key) => key.includes(":")));
});

test("buckets idle for the prune age are full again, so pruning forgets nothing", () => {
  for (const limit of [
    LOGIN_ACCOUNT_LIMIT,
    LOGIN_ADDRESS_LIMIT,
    SIGNUP_LIMIT,
    GUEST_LIMIT,
    REPORT_LIMIT,
    REPORT_ADDRESS_LIMIT,
    BLOCK_LIMIT,
    BLOCK_ADDRESS_LIMIT,
  ])
    assert.ok(
      (limit.capacity / limit.refillPerSecond) * 1000 <= BUCKET_PRUNE_AFTER_MS,
    );
});
