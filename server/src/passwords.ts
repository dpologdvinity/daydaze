// 100k is the Cloudflare Workers PBKDF2 ceiling; higher counts throw there.
const ITERATIONS = 100_000;
const SCHEME = "pbkdf2-sha256";
const SALT_BYTES = 16;
const HASH_BITS = 256;

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function fromBase64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Encodes as `pbkdf2-sha256$100000$<b64salt>$<b64hash>`. */
export async function hashPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(
    new Uint8Array(SALT_BYTES),
  ),
): Promise<string> {
  if (!isValidPassword(password)) throw new RangeError("Invalid password");
  const hash = await derive(password, salt, ITERATIONS);
  return [SCHEME, ITERATIONS, toBase64(salt), toBase64(hash)].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!isValidPassword(password)) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== SCHEME) return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  if (
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > ITERATIONS ||
    !salt ||
    !expected ||
    expected.length !== HASH_BITS / 8
  )
    return false;
  const actual = await derive(password, salt, iterations);
  // Constant-time: always walk every byte instead of returning at the first mismatch.
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= expected[i] ^ actual[i];
  return difference === 0;
}
