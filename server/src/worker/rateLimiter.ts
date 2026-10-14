import { DurableObject } from "cloudflare:workers";
import { createAuthLimiter, type AuthAction } from "../authLimits.ts";

/**
 * One per client IP address: login, signup and guest budgets.
 * shortcut: buckets live in memory, so an evicted (idle) object starts full again; persist them if abuse shows up.
 */
export class RateLimiter extends DurableObject<Env> {
  private readonly limiter = createAuthLimiter();

  /** 0 when allowed, otherwise seconds for Retry-After. */
  take(action: AuthAction, key: string): number {
    return this.limiter.take(action, key, Date.now());
  }
}
