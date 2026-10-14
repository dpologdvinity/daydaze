export type RateLimit = { capacity: number; refillPerSecond: number };

/** Clients send ~15 Hz; the burst absorbs packets bunched by network jitter. */
export const MOVEMENT_LIMIT: RateLimit = { capacity: 8, refillPerSecond: 15 };
export const ACCOUNT_CHAT_LIMIT: RateLimit = {
  capacity: 3,
  refillPerSecond: 1 / 2,
};
export const GUEST_CHAT_LIMIT: RateLimit = {
  capacity: 2,
  refillPerSecond: 1 / 4,
};
export const EMOTE_LIMIT: RateLimit = { capacity: 3, refillPerSecond: 1 };

// Per IP address. Login has a per-account bucket against password guessing and
// a wider one against trying many accounts.
export const LOGIN_ACCOUNT_LIMIT: RateLimit = {
  capacity: 5,
  refillPerSecond: 1 / 12,
};
export const LOGIN_ADDRESS_LIMIT: RateLimit = {
  capacity: 20,
  refillPerSecond: 1 / 6,
};
export const SIGNUP_LIMIT: RateLimit = {
  capacity: 3,
  refillPerSecond: 1 / 600,
};
export const GUEST_LIMIT: RateLimit = { capacity: 10, refillPerSecond: 1 / 30 };

export type RateLimiter = {
  /** Spends one token for `key` at `now` (ms); false when the bucket is empty. */
  take(key: string, now: number): boolean;
  /** Milliseconds until `take` would succeed; 0 when it would now. */
  retryAfterMs(key: string, now: number): number;
  forget(key: string): void;
};

/** Token bucket per key; a new key starts full. */
export function createRateLimiter({
  capacity,
  refillPerSecond,
}: RateLimit): RateLimiter {
  if (!(capacity >= 1 && Number.isFinite(capacity)))
    throw new RangeError("Invalid capacity");
  if (!(refillPerSecond > 0 && Number.isFinite(refillPerSecond)))
    throw new RangeError("Invalid refill rate");
  const buckets = new Map<string, { tokens: number; at: number }>();
  function refill(key: string, now: number) {
    const bucket = buckets.get(key);
    if (!bucket) return { tokens: capacity, at: now };
    // Keep the latest time seen so a backwards clock cannot refill twice.
    const at = Math.max(bucket.at, now);
    return {
      tokens: Math.min(
        capacity,
        bucket.tokens + ((at - bucket.at) / 1000) * refillPerSecond,
      ),
      at,
    };
  }
  return {
    take(key, now) {
      const { tokens, at } = refill(key, now);
      const allowed = tokens >= 1;
      buckets.set(key, { tokens: allowed ? tokens - 1 : tokens, at });
      return allowed;
    },
    retryAfterMs(key, now) {
      const { tokens } = refill(key, now);
      return tokens >= 1
        ? 0
        : Math.ceil(((1 - tokens) / refillPerSecond) * 1000);
    },
    forget(key) {
      buckets.delete(key);
    },
  };
}
