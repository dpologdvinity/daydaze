// Random session tokens, their SHA-256 digests for D1, player ids and a crypto-
// random number. Uses Web Crypto, so it runs in the Worker and in Node.

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** 256 random bits, sent only in the cookie. */
export function newSessionToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** D1 stores this digest, so a leaked table cannot be replayed as cookies. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** `g_` for guests, `u_` for accounts; 24 chars fits the 32-char network id. */
export function newPlayerId(kind: "g" | "u"): string {
  return `${kind}_${base64Url(crypto.getRandomValues(new Uint8Array(16)))}`;
}

/** A crypto-random number in [0, 1). */
export function randomUnit(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
