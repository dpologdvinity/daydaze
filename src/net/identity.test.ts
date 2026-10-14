import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIdentity } from "./identity.ts";

const identity = {
  id: "g_abc",
  name: "MangoGuest1234",
  isGuest: true,
  isAdmin: false,
};

test("identities need a network id, a display name and boolean flags", () => {
  assert.deepEqual(parseIdentity({ ...identity, extra: 1 }), identity);
  for (const bad of [
    null,
    "x",
    { ...identity, id: "" },
    { ...identity, name: "x" },
    { ...identity, isGuest: "yes" },
    { ...identity, isAdmin: 1 },
  ])
    assert.equal(parseIdentity(bad), null);
});
