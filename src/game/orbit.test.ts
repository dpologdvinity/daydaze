import { test } from "node:test";
import assert from "node:assert/strict";
import { BAR, BARTENDER, BLOCKERS, SHELF_X, STOOL_X } from "./orbit.ts";

test("the bartender stands in an aisle between the bar and the back shelf", () => {
  const [x] = BARTENDER;
  assert.ok(x - 0.25 > BAR.back, "clear of the counter");
  assert.ok(x + 0.25 < SHELF_X, "clear of the shelf");
  assert.ok(STOOL_X < BAR.front, "stools face the bar from the floor");
});

test("walkers can't wander into the bartender's aisle", () => {
  const [x, z] = BARTENDER;
  const inBox = (b: readonly (readonly [number, number])[]) => {
    const xs = b.map((p) => p[0]);
    const zs = b.map((p) => p[1]);
    return (
      x > Math.min(...xs) &&
      x < Math.max(...xs) &&
      z > Math.min(...zs) &&
      z < Math.max(...zs)
    );
  };
  assert.ok(BLOCKERS.some(inBox));
});
