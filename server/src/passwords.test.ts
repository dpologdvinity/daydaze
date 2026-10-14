import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, isValidPassword, verifyPassword } from "./passwords.ts";

const salt = new Uint8Array(16).fill(7);

test("hashes use the pbkdf2-sha256$100000$salt$hash format with a fresh salt", async () => {
  const stored = await hashPassword("correct horse");
  const [scheme, iterations, encodedSalt, hash] = stored.split("$");
  assert.equal(scheme, "pbkdf2-sha256");
  assert.equal(iterations, "100000");
  assert.equal(atob(encodedSalt).length, 16);
  assert.equal(atob(hash).length, 32);
  assert.notEqual(await hashPassword("correct horse"), stored);
});

test("a given salt is deterministic and verifies only the right password", async () => {
  const stored = await hashPassword("correct horse", salt);
  assert.equal(await hashPassword("correct horse", salt), stored);
  assert.equal(await verifyPassword("correct horse", stored), true);
  assert.equal(await verifyPassword("correct horsf", stored), false);
  assert.equal(await verifyPassword("Correct horse", stored), false);
});

test("password rules allow 8 to 128 characters", async () => {
  assert.equal(isValidPassword("1234567"), false);
  assert.equal(isValidPassword("12345678"), true);
  assert.equal(isValidPassword("x".repeat(128)), true);
  assert.equal(isValidPassword("x".repeat(129)), false);
  await assert.rejects(hashPassword("short"), RangeError);
  await assert.rejects(hashPassword("x".repeat(129)), RangeError);
});

test("corrupt or foreign stored hashes never verify", async () => {
  const stored = await hashPassword("correct horse", salt);
  const [, , encodedSalt, hash] = stored.split("$");
  for (const bad of [
    "",
    "plain",
    `bcrypt$100000$${encodedSalt}$${hash}`,
    `pbkdf2-sha256$abc$${encodedSalt}$${hash}`,
    `pbkdf2-sha256$0$${encodedSalt}$${hash}`,
    `pbkdf2-sha256$100001$${encodedSalt}$${hash}`,
    `pbkdf2-sha256$100000$!!!$${hash}`,
    `pbkdf2-sha256$100000$${encodedSalt}$${hash.slice(4)}`,
    `${stored}$extra`,
  ])
    assert.equal(await verifyPassword("correct horse", bad), false, bad);
  assert.equal(await verifyPassword("short", stored), false);
});
