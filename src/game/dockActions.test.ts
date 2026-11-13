import { test } from "node:test";
import assert from "node:assert/strict";
import { splitActions, type DockAction } from "./dockActions.ts";

const a = (id: string, priority: number): DockAction => ({ id, priority });

test("no actions: nothing to show", () => {
  assert.deepEqual(splitActions([]), { primary: null, more: [] });
});

test("one action is the primary and there is no more menu", () => {
  assert.deepEqual(splitActions([a("seat", 2)]), {
    primary: a("seat", 2),
    more: [],
  });
});

test("the lowest priority number is the primary; the rest keep priority order", () => {
  const { primary, more } = splitActions([
    a("drive", 3),
    a("el-y", 0.1),
    a("taxi", 1),
    a("el-x", 0),
  ]);
  assert.equal(primary?.id, "el-x");
  assert.deepEqual(
    more.map((m) => m.id),
    ["el-y", "taxi", "drive"],
  );
});

test("equal priorities keep the order they were given in", () => {
  const { primary, more } = splitActions([a("b", 1), a("c", 1), a("a", 1)]);
  assert.equal(primary?.id, "b");
  assert.deepEqual(
    more.map((m) => m.id),
    ["c", "a"],
  );
});

test("the input is not reordered in place", () => {
  const input = [a("z", 2), a("y", 1)];
  splitActions(input);
  assert.deepEqual(
    input.map((x) => x.id),
    ["z", "y"],
  );
});
