import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_CHAT_LIMIT,
  createRateLimiter,
  EMOTE_LIMIT,
  GUEST_CHAT_LIMIT,
  MOVEMENT_LIMIT,
} from "./rateLimit.ts";

function takes(
  limiter: ReturnType<typeof createRateLimiter>,
  key: string,
  times: number[],
): boolean[] {
  return times.map((now) => limiter.take(key, now));
}

test("a full bucket allows a burst of capacity, then refills over time", () => {
  const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 0.5 });
  assert.deepEqual(takes(limiter, "a", [0, 0, 0, 0]), [
    true,
    true,
    true,
    false,
  ]);
  assert.equal(limiter.take("a", 1999), false);
  assert.equal(limiter.take("a", 2000), true);
  assert.equal(limiter.take("a", 2000), false);
});

test("refill never exceeds capacity after a long idle period", () => {
  const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1 });
  takes(limiter, "a", [0, 0]);
  assert.deepEqual(takes(limiter, "a", [60_000, 60_000, 60_000]), [
    true,
    true,
    false,
  ]);
});

test("keys are independent and forget resets a key", () => {
  const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
  assert.equal(limiter.take("a", 0), true);
  assert.equal(limiter.take("a", 0), false);
  assert.equal(limiter.take("b", 0), true);
  limiter.forget("a");
  assert.equal(limiter.take("a", 0), true);
});

test("a clock that steps backwards does not mint tokens", () => {
  const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
  assert.equal(limiter.take("a", 10_000), true);
  assert.equal(limiter.take("a", 0), false);
  assert.equal(limiter.take("a", 10_999), false);
});

test("invalid limits are rejected", () => {
  for (const limit of [
    { capacity: 0, refillPerSecond: 1 },
    { capacity: 1, refillPerSecond: 0 },
    { capacity: NaN, refillPerSecond: 1 },
    { capacity: 1, refillPerSecond: Infinity },
  ])
    assert.throws(() => createRateLimiter(limit), RangeError);
});

test("spec limits: chat 1/2s burst 3 for accounts, 1/4s burst 2 for guests, emotes 1/s burst 3, movement ~15/s", () => {
  const account = createRateLimiter(ACCOUNT_CHAT_LIMIT);
  assert.deepEqual(takes(account, "a", [0, 0, 0, 0, 2000]), [
    true,
    true,
    true,
    false,
    true,
  ]);
  const guest = createRateLimiter(GUEST_CHAT_LIMIT);
  assert.deepEqual(takes(guest, "g", [0, 0, 0, 2000, 4000]), [
    true,
    true,
    false,
    false,
    true,
  ]);
  const emote = createRateLimiter(EMOTE_LIMIT);
  assert.deepEqual(takes(emote, "e", [0, 0, 0, 0, 1000]), [
    true,
    true,
    true,
    false,
    true,
  ]);
  const movement = createRateLimiter(MOVEMENT_LIMIT);
  const sustained = Array.from({ length: 150 }, (_, i) => (i * 1000) / 15);
  assert.ok(takes(movement, "m", sustained).every(Boolean));
  const flood = Array.from({ length: 100 }, () => 20_000);
  const allowed = takes(movement, "m", flood).filter(Boolean).length;
  assert.ok(allowed >= 5 && allowed <= 15, `${allowed}`);
});

test("retryAfterMs says how long until the next token", () => {
  const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 0.5 });
  assert.equal(limiter.retryAfterMs("a", 0), 0);
  limiter.take("a", 0);
  limiter.take("a", 0);
  assert.equal(limiter.take("a", 0), false);
  assert.equal(limiter.retryAfterMs("a", 0), 2000);
  assert.equal(limiter.retryAfterMs("a", 1500), 500);
  assert.equal(limiter.retryAfterMs("a", 2000), 0);
  assert.equal(limiter.retryAfterMs("unknown", 0), 0);
});
