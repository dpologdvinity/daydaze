/** Normalised origins from a comma-separated ALLOWED_ORIGINS value. */
export function parseAllowedOrigins(
  value: string | undefined,
): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const entry of (value ?? "").split(",")) {
    try {
      const origin = new URL(entry.trim()).origin;
      if (origin !== "null") origins.add(origin);
    } catch {
      // Not a URL: skip it rather than allow something unintended.
    }
  }
  return origins;
}

/**
 * CSRF and cross-site WebSocket check for state-changing requests. Browsers
 * always send Origin on these, so a missing header means a non-browser client,
 * which holds no victim's cookie. "null" (sandboxed frames) is refused.
 */
export function isAllowedOrigin(
  origin: string | null,
  requestOrigin: string,
  allowed: ReadonlySet<string>,
): boolean {
  if (origin === null) return true;
  return origin === requestOrigin || allowed.has(origin);
}

export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  // Sessions, saves and headcounts are per user or change constantly.
  headers.set("Cache-Control", "no-store");
}
