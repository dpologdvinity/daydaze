import {
  BLOCK_LIMIT,
  createRateLimiter,
  GUEST_LIMIT,
  LOGIN_ACCOUNT_LIMIT,
  LOGIN_ADDRESS_LIMIT,
  REPORT_LIMIT,
  SIGNUP_LIMIT,
} from "./rateLimit.ts";

export type AuthAction = "login" | "signup" | "guest" | "report" | "block";

/**
 * Budgets for one IP address (or, for reports and blocks, one player too).
 * `take` returns 0 when allowed, otherwise the whole seconds for Retry-After.
 */
export function createAuthLimiter() {
  const account = createRateLimiter(LOGIN_ACCOUNT_LIMIT);
  const address = createRateLimiter(LOGIN_ADDRESS_LIMIT);
  const others = {
    signup: createRateLimiter(SIGNUP_LIMIT),
    guest: createRateLimiter(GUEST_LIMIT),
    report: createRateLimiter(REPORT_LIMIT),
    block: createRateLimiter(BLOCK_LIMIT),
  };
  const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
  return {
    /** `key` is the lowercased username for logins, ignored otherwise. */
    take(action: AuthAction, key: string, now: number): number {
      if (action === "login") {
        if (!account.take(key, now))
          return seconds(account.retryAfterMs(key, now));
        if (!address.take("", now))
          return seconds(address.retryAfterMs("", now));
        return 0;
      }
      const limiter = others[action];
      return limiter.take("", now) ? 0 : seconds(limiter.retryAfterMs("", now));
    },
  };
}
