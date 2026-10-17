import assert from "node:assert/strict";
import test from "node:test";
import {
  ballSeconds,
  gradeSwing,
  matchOver,
  NEW_MATCH,
  play,
  POINTS,
  pointsWon,
  REACH,
  sideOf,
  SWEET,
  WINNER_FROM,
} from "./tennis.ts";

test("swings grade by how close they come to the ball's arrival", () => {
  assert.equal(gradeSwing(0), "perfect");
  assert.equal(gradeSwing(-SWEET), "perfect");
  assert.equal(gradeSwing(REACH * 0.9), "good");
  assert.equal(gradeSwing(-REACH - 0.01), "early");
  assert.equal(gradeSwing(REACH + 0.01), "late");
  assert.equal(gradeSwing(Number.NaN), "late");
});

test("the ball comes quicker as the rally goes on, but never too quick", () => {
  assert.ok(ballSeconds(3) < ballSeconds(0));
  assert.equal(ballSeconds(50), 0.75);
});

test("a rally builds until a perfect swing late in it wins the point", () => {
  let m = NEW_MATCH;
  for (let i = 0; i < WINNER_FROM - 1; i++) {
    const r = play(m, "perfect");
    assert.equal(r.outcome, "rally");
    m = r.match;
  }
  const win = play(m, "perfect");
  assert.equal(win.outcome, "winner");
  assert.deepEqual(win.match, { points: [true], rally: 0 });
});

test("a good swing keeps the rally going; a miss loses the point", () => {
  const kept = play({ points: [], rally: 5 }, "good");
  assert.deepEqual([kept.outcome, kept.match.rally], ["rally", 6]);
  const lost = play({ points: [true], rally: 2 }, "late");
  assert.equal(lost.outcome, "lost");
  assert.deepEqual(lost.match, { points: [true, false], rally: 0 });
});

test("the match is seven points; play stops after", () => {
  let m = NEW_MATCH;
  for (let i = 0; i < POINTS + 2; i++)
    m = play(m, i % 2 ? "early" : "late").match;
  assert.ok(matchOver(m));
  assert.equal(m.points.length, POINTS);
  assert.equal(pointsWon(m), 0);
});

test("the ball comes to both sides", () => {
  const sides = new Set<number>();
  for (let p = 0; p < 7; p++)
    for (let r = 0; r < 6; r++) sides.add(sideOf(p, r));
  assert.deepEqual([...sides].sort(), [-1, 1]);
});
