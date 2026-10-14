import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// public/_headers is copied into dist/ by Vite and applied by Workers static
// assets to every asset response (the Worker itself only handles /api and /ws).
const rules = readFileSync(
  join(import.meta.dirname, "../../public/_headers"),
  "utf8",
);

function headersFor(path: string): Map<string, string> {
  const headers = new Map<string, string>();
  let active = false;
  for (const line of rules.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) active = line.trim() === path;
    else if (active) {
      const [name, ...value] = line.trim().split(":");
      headers.set(name.trim().toLowerCase(), value.join(":").trim());
    }
  }
  return headers;
}

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources]),
  );
}

test("every static response gets the app's Content-Security-Policy", () => {
  const csp = directives(headersFor("/*").get("content-security-policy") ?? "");
  assert.deepEqual(Object.fromEntries(csp), {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    // CSP Level 3: 'self' also covers ws: and wss: to the same host.
    "connect-src": ["'self'"],
    "font-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  });
});

test("static responses also refuse sniffing and limit referrers", () => {
  const headers = headersFor("/*");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
});
