import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearSessionCookie,
  readSessionToken,
  SESSION_COOKIE,
  sessionCookie,
} from "./cookies.ts";

const token = "a".repeat(43);

test("the session cookie is HTTP-only, Secure, SameSite=Lax and site-wide", () => {
  const cookie = sessionCookie(token);
  assert.ok(cookie.startsWith(`${SESSION_COOKIE}=${token};`));
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"])
    assert.ok(cookie.split("; ").includes(attribute), attribute);
  assert.match(cookie, /Max-Age=\d+/);
  assert.match(clearSessionCookie(), /^dd_session=; .*Max-Age=0/);
  assert.ok(clearSessionCookie().includes("HttpOnly"));
});

test("the session token is read from a cookie header among others", () => {
  assert.equal(readSessionToken(`${SESSION_COOKIE}=${token}`), token);
  assert.equal(
    readSessionToken(`theme=dark; ${SESSION_COOKIE}=${token}; x=1`),
    token,
  );
});

test("missing or malformed tokens read as no session", () => {
  for (const header of [
    null,
    "",
    "theme=dark",
    `${SESSION_COOKIE}=`,
    `${SESSION_COOKIE}=short`,
    `${SESSION_COOKIE}=${"a".repeat(42)}!`,
    `x${SESSION_COOKIE}=${token}`,
  ])
    assert.equal(readSessionToken(header), null, String(header));
});
