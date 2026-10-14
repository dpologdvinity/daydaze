import { test } from "node:test";
import assert from "node:assert/strict";
import { isNetworkId } from "../../src/net/networkProtocol.ts";
import { readSessionToken } from "./cookies.ts";
import {
  hashToken,
  newPlayerId,
  newSessionToken,
  randomUnit,
} from "./sessions.ts";

test("session tokens are unique 256-bit base64url strings the cookie reader accepts", () => {
  const a = newSessionToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newSessionToken(), a);
  assert.equal(readSessionToken(`dd_session=${a}`), a);
});

test("tokens are stored as SHA-256 hex, never as themselves", async () => {
  assert.equal(
    await hashToken("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("player ids are prefixed by kind and fit the network id limit", () => {
  const guest = newPlayerId("g");
  const user = newPlayerId("u");
  assert.match(guest, /^g_[A-Za-z0-9_-]{22}$/);
  assert.match(user, /^u_[A-Za-z0-9_-]{22}$/);
  assert.ok(isNetworkId(guest));
  assert.notEqual(newPlayerId("g"), guest);
});

test("randomUnit is in [0, 1)", () => {
  for (let i = 0; i < 1000; i++) {
    const value = randomUnit();
    assert.ok(value >= 0 && value < 1);
  }
});
