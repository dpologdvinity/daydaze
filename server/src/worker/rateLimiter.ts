import { DurableObject } from "cloudflare:workers";
import {
  BUCKET_PRUNE_AFTER_MS,
  createAuthLimiter,
  type AuthAction,
  type LimitScope,
} from "../authLimits.ts";

/**
 * One per client IP address (login, signup, guest, report and block budgets)
 * or per player (report and block). Buckets live in this object's SQLite
 * storage, so eviction does not hand out fresh budgets.
 */
export class RateLimiter extends DurableObject<Env> {
  private readonly limiter: ReturnType<typeof createAuthLimiter>;
  private pruneScheduled = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec(
      `CREATE TABLE IF NOT EXISTS buckets (
        key TEXT PRIMARY KEY,
        tokens REAL NOT NULL,
        at REAL NOT NULL
      )`,
    );
    this.limiter = createAuthLimiter({
      get(key) {
        const [row] = sql
          .exec("SELECT tokens, at FROM buckets WHERE key = ?", key)
          .toArray();
        return typeof row?.tokens === "number" && typeof row.at === "number"
          ? { tokens: row.tokens, at: row.at }
          : undefined;
      },
      set(key, { tokens, at }) {
        sql.exec(
          `INSERT INTO buckets (key, tokens, at) VALUES (?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET tokens = excluded.tokens, at = excluded.at`,
          key,
          tokens,
          at,
        );
      },
      delete(key) {
        sql.exec("DELETE FROM buckets WHERE key = ?", key);
      },
    });
  }

  /** 0 when allowed, otherwise seconds for Retry-After. */
  async take(
    action: AuthAction,
    key: string,
    scope: LimitScope,
  ): Promise<number> {
    const retryAfter = this.limiter.take(action, key, Date.now(), scope);
    if (!this.pruneScheduled) {
      this.pruneScheduled = true;
      if ((await this.ctx.storage.getAlarm()) === null)
        await this.ctx.storage.setAlarm(Date.now() + BUCKET_PRUNE_AFTER_MS);
    }
    return retryAfter;
  }

  /** Drops buckets that are full again; reschedules while any remain. */
  async alarm(): Promise<void> {
    const sql = this.ctx.storage.sql;
    sql.exec(
      "DELETE FROM buckets WHERE at < ?",
      Date.now() - BUCKET_PRUNE_AFTER_MS,
    );
    const [row] = sql.exec("SELECT COUNT(*) AS count FROM buckets").toArray();
    if (Number(row?.count ?? 0) > 0)
      await this.ctx.storage.setAlarm(Date.now() + BUCKET_PRUNE_AFTER_MS);
    else this.pruneScheduled = false;
  }
}
