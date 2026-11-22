// Police sight through city footprints, including walls near both endpoints.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Vec2 } from "../walk.ts";
import { hasPoliceSight } from "./wanted.ts";

const wall: Vec2[] = [
  [1, -1],
  [2, -1],
  [2, 1],
  [1, 1],
];

test("a solid wall hides the player from police", () => {
  assert.equal(hasPoliceSight([0, 0], [3, 0], [wall]), false);
  assert.equal(hasPoliceSight([0, 2], [3, 2], [wall]), true);
  assert.equal(hasPoliceSight([1.3, 0], [1.8, 0], [wall]), false);
});
