import {
  createRateLimiter,
  GUEST_LIMIT,
  LOGIN_ACCOUNT_LIMIT,
  LOGIN_ADDRESS_LIMIT,
  SIGNUP_LIMIT,
} from "./rateLimit.ts";

export type AuthAction = "login" | "signup" | "guest";

/**
 * Budgets for one IP address. `take` returns 0 when allowed, otherwise the
 * whole seconds to put in Retry-After.
 */
export function createAuthLimiter() {
  const account = createRateLimiter(LOGIN_ACCOUNT_LIMIT);
  const address = createRateLimiter(LOGIN_ADDRESS_LIMIT);
  const signup = createRateLimiter(SIGNUP_LIMIT);
  const guest = createRateLimiter(GUEST_LIMIT);
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
      const limiter = action === "signup" ? signup : guest;
      return limiter.take("", now) ? 0 : seconds(limiter.retryAfterMs("", now));
    },
  };
}
