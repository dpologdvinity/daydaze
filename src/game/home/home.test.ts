import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOME, toggleLock, validateHome } from "./home.ts";

test("a new apartment door starts locked", () => {
  assert.equal(DEFAULT_HOME.locked, true);
  assert.deepEqual(DEFAULT_HOME.furniture, []);
});

test("toggling the lock flips it without touching the furniture", () => {
  const home = {
    locked: true,
    furniture: [
      { id: "lamp" as const, cell: [0, 0] as const, rotation: 0 as const },
    ],
  };
  const open = toggleLock(home);
  assert.equal(open.locked, false);
  assert.deepEqual(open.furniture, home.furniture);
  assert.equal(toggleLock(open).locked, true);
  assert.equal(home.locked, true, "input is not mutated");
});

test("a save with no home field gets a locked, empty apartment", () => {
  assert.deepEqual(validateHome(undefined), DEFAULT_HOME);
  assert.deepEqual(validateHome("home"), DEFAULT_HOME);
});

test("a malformed lock flag falls back to locked", () => {
  assert.equal(validateHome({ locked: "no", furniture: [] }).locked, true);
  assert.equal(validateHome({ locked: false, furniture: [] }).locked, false);
});

test("saved furniture passes through validation", () => {
  const home = validateHome({
    locked: false,
    furniture: [{ id: "rug", cell: [1, 2], rotation: 0 }, { id: "nope" }],
  });
  assert.deepEqual(home.furniture, [{ id: "rug", cell: [1, 2], rotation: 0 }]);
});
