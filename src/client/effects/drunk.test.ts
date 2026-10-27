// At the default 13+ tier drinking never builds a buzz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drink, getBuzz } from "./drunk.ts";

test("a drink at 13+ leaves the player sober", () => {
  drink("shot");
  assert.equal(getBuzz(), 0);
});
