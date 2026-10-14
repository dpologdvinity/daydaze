import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUsername } from "./chatFilter.ts";
import { generateGuestName } from "./guestNames.ts";

test("guest names are a word, 'Guest' and four digits", () => {
  assert.equal(
    generateGuestName(() => 0),
    "MangoGuest1000",
  );
  assert.match(
    generateGuestName(() => 0.999999),
    /^[A-Z][a-z]+Guest9999$/,
  );
  assert.match(generateGuestName(Math.random), /^[A-Z][a-z]+Guest\d{4}$/);
});

test("a random source that returns 1 or junk still yields a valid name", () => {
  for (const value of [1, -1, NaN, 5])
    assert.match(
      generateGuestName(() => value),
      /^[A-Z][a-z]+Guest\d{4}$/,
    );
});

test("every possible guest name passes the username filter and fits a name field", () => {
  for (let i = 0; i < 1000; i++) {
    const name = generateGuestName(() => i / 1000);
    assert.ok(isAllowedUsername(name), name);
    assert.ok(name.length <= 20, name);
  }
});
