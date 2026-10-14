import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthLimiter } from "./authLimits.ts";

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

test("reports and blocks have their own budgets", () => {
  const limiter = createAuthLimiter();
  const run = (kind: "report" | "block", times: number) =>
    Array.from({ length: times }, () => limiter.take(kind, "", 0) === 0).filter(
      Boolean,
    ).length;
  assert.equal(run("report", 20), 5);
  assert.equal(run("block", 50), 20);
  assert.ok(limiter.take("report", "", 0) >= 1);
  assert.equal(limiter.take("report", "", 60_000), 0);
});
