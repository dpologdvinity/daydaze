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

export type RateLimiter = {
  /** Spends one token for `key` at `now` (ms); false when the bucket is empty. */
  take(key: string, now: number): boolean;
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
  return {
    take(key, now) {
      const bucket = buckets.get(key);
      let tokens = capacity;
      let at = now;
      if (bucket) {
        // Keep the latest time seen so a backwards clock cannot refill twice.
        at = Math.max(bucket.at, now);
        tokens = Math.min(
          capacity,
          bucket.tokens + ((at - bucket.at) / 1000) * refillPerSecond,
        );
      }
      const allowed = tokens >= 1;
      buckets.set(key, { tokens: allowed ? tokens - 1 : tokens, at });
      return allowed;
    },
    forget(key) {
      buckets.delete(key);
    },
  };
}
