import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closeOut,
  judgePress,
  judgesScore,
  NEW_ROUTINE,
  press,
  ROUTINE,
  ROUTINE_SECONDS,
} from "./gymnastics.ts";

test("the routine's elements run in order inside its length", () => {
  ROUTINE.forEach((e, i) => {
    assert.ok(e.at < ROUTINE_SECONDS);
    if (i) assert.ok(e.at > ROUTINE[i - 1].at + 1.2);
  });
});

test("a press is judged against the nearest cue", () => {
  assert.equal(judgePress(6.52)?.mark, "stuck");
  assert.equal(judgePress(6.7)?.mark, "near");
  assert.equal(judgePress(7.1)?.mark, "miss");
  assert.equal(judgePress(6.5)?.element, 2);
});

test("a perfect routine scores over ten with its difficulty", () => {
  let r = NEW_ROUTINE;
  for (const e of ROUTINE) r = press(r, e.at);
  const bonus = ROUTINE.reduce((s, e) => s + e.difficulty, 0);
  assert.equal(judgesScore(r), Math.round((10 + bonus) * 1000) / 1000);
});

test("unpressed elements are missed once the clock passes them", () => {
  const r = closeOut(NEW_ROUTINE, ROUTINE_SECONDS);
  assert.ok(r.marks.every((m) => m === "miss"));
  assert.equal(judgesScore(r), 6);
});

test("each element is judged once", () => {
  const once = press(NEW_ROUTINE, 2.5);
  assert.equal(press(once, 2.52), once);
});
