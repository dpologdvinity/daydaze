import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEPTH,
  NERVE,
  newRun,
  open,
  rightDoor,
  runOver,
  runScore,
} from "./hauntedRun.ts";

test("the right door leads a room deeper; a wrong one costs nerve", () => {
  const run = newRun(42);
  const right = rightDoor(42, 0);
  const deeper = open(run, right);
  assert.equal(deeper.run.depth, 1);
  assert.equal(deeper.scared, false);
  const wrong = open(run, (right + 1) % 3);
  assert.equal(wrong.run.depth, 0);
  assert.equal(wrong.run.nerve, NERVE - 1);
  assert.equal(wrong.scared, true);
});

test("the way out is fixed by the seed", () => {
  for (let i = 0; i < DEPTH; i++) {
    assert.equal(rightDoor(7, i), rightDoor(7, i));
    assert.ok([0, 1, 2].includes(rightDoor(7, i)));
  }
});

test("out with nerve to spare scores; losing your nerve ends it", () => {
  let run = newRun(3);
  for (let i = 0; i < DEPTH; i++) run = open(run, rightDoor(3, i)).run;
  assert.ok(runOver(run));
  assert.equal(run.escaped, true);
  assert.equal(runScore(run), NERVE * 100 + 200);
  let scared = newRun(3);
  for (let i = 0; i < NERVE; i++)
    scared = open(scared, (rightDoor(3, 0) + 1) % 3).run;
  assert.ok(runOver(scared));
  assert.equal(scared.escaped, false);
  assert.equal(runScore(scared), 0);
  assert.equal(open(scared, rightDoor(3, 0)).run, scared);
});
