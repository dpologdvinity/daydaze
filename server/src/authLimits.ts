import {
  BLOCK_ADDRESS_LIMIT,
  BLOCK_LIMIT,
  createRateLimiter,
  type BucketStore,
  type RateLimit,
  GUEST_LIMIT,
  LOGIN_ACCOUNT_LIMIT,
  LOGIN_ADDRESS_LIMIT,
  REPORT_ADDRESS_LIMIT,
  REPORT_LIMIT,
  SIGNUP_LIMIT,
} from "./rateLimit.ts";

/** Idle buckets older than this are full again and can be deleted. */
export const BUCKET_PRUNE_AFTER_MS = 60 * 60 * 1000;

export type AuthAction = "login" | "signup" | "guest" | "report" | "block";
/** Which Durable Object is asking: one per IP address, or one per player. */
export type LimitScope = "address" | "player";

/**
 * Budgets for one IP address (or, for reports and blocks, one player too).
 * `take` returns 0 when allowed, otherwise the whole seconds for Retry-After.
 */
export function createAuthLimiter(store: BucketStore = new Map()) {
  // One store for every budget, each under its own key prefix.
  const limiter = (name: string, limit: RateLimit) =>
    createRateLimiter(limit, {
      get: (key) => store.get(`${name}:${key}`),
      set: (key, bucket) => store.set(`${name}:${key}`, bucket),
      delete: (key) => store.delete(`${name}:${key}`),
    });
  const account = limiter("login-account", LOGIN_ACCOUNT_LIMIT);
  const address = limiter("login-address", LOGIN_ADDRESS_LIMIT);
  const others = {
    signup: limiter("signup", SIGNUP_LIMIT),
    guest: limiter("guest", GUEST_LIMIT),
    report: limiter("report-address", REPORT_ADDRESS_LIMIT),
    block: limiter("block-address", BLOCK_ADDRESS_LIMIT),
  };
  const perPlayer = {
    report: limiter("report-player", REPORT_LIMIT),
    block: limiter("block-player", BLOCK_LIMIT),
  };
  const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
  return {
    /** `key` is the lowercased username for logins, ignored otherwise. */
    take(
      action: AuthAction,
      key: string,
      now: number,
      scope: LimitScope = "address",
    ): number {
      if (action === "login") {
        if (!account.take(key, now))
          return seconds(account.retryAfterMs(key, now));
        if (!address.take("", now))
          return seconds(address.retryAfterMs("", now));
        return 0;
      }
      const limiter =
        scope === "player" && (action === "report" || action === "block")
          ? perPlayer[action]
          : others[action];
      return limiter.take("", now) ? 0 : seconds(limiter.retryAfterMs("", now));
    },
  };
}
