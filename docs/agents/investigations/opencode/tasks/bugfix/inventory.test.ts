import { test } from "node:test";
import assert from "node:assert/strict";
import { add, MAX } from "./inventory.ts";
test("merges without overfilling a stack", () => {
  const slots = [{ id: "apple", count: 7 }, null, null];
  assert.equal(add(slots, "apple", 5), 0);
  assert.deepEqual(slots, [{ id: "apple", count: MAX }, { id: "apple", count: 2 }, null]);
});
test("reports overflow", () => {
  const slots = [null];
  assert.equal(add(slots, "rock", 25), 15);
});
