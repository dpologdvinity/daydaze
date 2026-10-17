import assert from "node:assert/strict";
import test from "node:test";
import { closeOut, judgesScore, newRoutine, press } from "./gymnastics.ts";
import { PROGRAM, PROGRAM_SECONDS } from "./iceShow.ts";

test("the program's elements come in order, inside its length", () => {
  PROGRAM.forEach((e, i) => {
    if (i) assert.ok(e.at > PROGRAM[i - 1].at, e.name);
    assert.ok(e.at < PROGRAM_SECONDS);
  });
});

test("it's judged like a floor routine: stuck elements add their difficulty", () => {
  let r = newRoutine(PROGRAM);
  for (const e of PROGRAM) r = press(r, e.at, PROGRAM);
  const best = 10 + PROGRAM.reduce((t, e) => t + e.difficulty, 0);
  assert.equal(judgesScore(r, PROGRAM), Math.round(best * 1000) / 1000);
  const skipped = closeOut(newRoutine(PROGRAM), PROGRAM_SECONDS, PROGRAM);
  assert.equal(judgesScore(skipped, PROGRAM), 10 - 0.5 * PROGRAM.length);
});
