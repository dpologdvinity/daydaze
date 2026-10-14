export const SESSION_COOKIE = "dd_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const ATTRIBUTES = "Path=/; HttpOnly; Secure; SameSite=Lax";

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
}

/** The token from a Cookie header, if it has the shape newSessionToken makes. */
export function readSessionToken(header: string | null): string | null {
  for (const part of (header ?? "").split(";")) {
    const [name, value] = part.trim().split("=", 2);
    if (name === SESSION_COOKIE && /^[A-Za-z0-9_-]{43}$/.test(value ?? ""))
      return value;
  }
  return null;
}
