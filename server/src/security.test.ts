import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applySecurityHeaders,
  isAllowedOrigin,
  parseAllowedOrigins,
} from "./security.ts";

const allowed = parseAllowedOrigins(
  " http://localhost:5173 ,https://daydaze.example/, not a url,,http://127.0.0.1:5173",
);
const self = "https://api.daydaze.example";

test("the allowlist keeps only valid origins, normalised", () => {
  assert.deepEqual([...allowed].sort(), [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://daydaze.example",
  ]);
  assert.equal(parseAllowedOrigins(undefined).size, 0);
});

test("allowed, same-origin and non-browser requests pass", () => {
  assert.equal(isAllowedOrigin("http://localhost:5173", self, allowed), true);
  assert.equal(isAllowedOrigin("https://daydaze.example", self, allowed), true);
  assert.equal(isAllowedOrigin(self, self, new Set()), true);
  // Only browsers send Origin, and CSRF needs a victim's browser.
  assert.equal(isAllowedOrigin(null, self, new Set()), true);
});

test("foreign, look-alike and opaque origins are refused", () => {
  for (const origin of [
    "https://evil.example",
    "https://daydaze.example.evil.example",
    "http://daydaze.example",
    "https://daydaze.example:8443",
    "http://localhost:5174",
    "null",
    "",
    "garbage",
  ])
    assert.equal(isAllowedOrigin(origin, self, allowed), false, origin);
});

test("security headers forbid sniffing, referrers and caching", () => {
  const headers = new Headers({ "Content-Type": "application/json" });
  applySecurityHeaders(headers);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(headers.get("Cache-Control"), "no-store");
  assert.equal(headers.get("Content-Type"), "application/json");
});
