import { test } from "node:test";
import assert from "node:assert/strict";
import { moveAction, MOVE_CODES } from "./input.ts";

const none = { x: 0, z: 0 };

test("nothing held and no stick is no move", () => {
  assert.equal(moveAction([], none), null);
  assert.equal(moveAction(["KeyQ", "Space"], none), null);
});

test("WASD and the arrows mean the same thing", () => {
  assert.deepEqual(moveAction(["KeyW"], none), [0, 1]);
  assert.deepEqual(moveAction(["ArrowUp"], none), [0, 1]);
  assert.deepEqual(moveAction(["KeyA"], none), [-1, 0]);
  assert.deepEqual(moveAction(["ArrowRight"], none), [1, 0]);
});

test("opposite keys cancel and a diagonal is clamped to unit length", () => {
  assert.equal(moveAction(["KeyW", "KeyS"], none), null);
  const [x, z] = moveAction(["KeyW", "KeyD"], none) ?? [0, 0];
  assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-9);
  assert.ok(x > 0 && z > 0);
});

test("the stick adds to the keys, and a half stick stays half speed", () => {
  assert.deepEqual(moveAction([], { x: 0, z: 0.5 }), [0, 0.5]);
  const [x, z] = moveAction([], { x: 0.3, z: 0.4 }) ?? [0, 0];
  assert.ok(
    Math.abs(Math.hypot(x, z) - 0.5) < 1e-9,
    "a half stick walks at half speed",
  );
});

test("non-finite stick input is no move", () => {
  assert.equal(moveAction([], { x: Number.NaN, z: 0 }), null);
});

test("every move code is a key the action knows", () => {
  for (const code of MOVE_CODES)
    assert.notEqual(moveAction([code], none), null, code);
});
