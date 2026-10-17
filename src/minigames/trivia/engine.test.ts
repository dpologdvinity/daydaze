import assert from "node:assert/strict";
import test from "node:test";
import {
  answer,
  correct,
  current,
  grade,
  newGame,
  over,
  ROUND,
} from "./engine.ts";
import { QUESTIONS } from "./questions.ts";

test("the bank has enough distinct questions, each with four distinct answers", () => {
  assert.ok(QUESTIONS.length >= ROUND * 3);
  assert.equal(new Set(QUESTIONS.map((q) => q.q)).size, QUESTIONS.length);
  for (const q of QUESTIONS) assert.equal(new Set(q.answers).size, 4, q.q);
});

test("a game deals ten different questions with the right answer marked", () => {
  const g = newGame(42);
  assert.equal(g.cards.length, ROUND);
  assert.equal(new Set(g.cards.map((c) => c.q)).size, ROUND);
  for (const c of g.cards) {
    const source = QUESTIONS.find((q) => q.q === c.q);
    assert.ok(source);
    assert.equal(c.answers[c.right], source.answers[0]);
  }
  assert.deepEqual(newGame(42), g);
  assert.notDeepEqual(newGame(43).cards, g.cards);
});

test("the right answer isn't always in the same place", () => {
  const spots = new Set(newGame(7).cards.map((c) => c.right));
  assert.ok(spots.size > 1);
});

test("answering every question right is an S; the game ends after ten", () => {
  let g = newGame(5);
  while (!over(g)) {
    const c = current(g);
    assert.ok(c);
    g = answer(g, c.right);
  }
  assert.equal(correct(g), ROUND);
  assert.equal(grade(correct(g)), "S");
  assert.equal(answer(g, 0), g);
  let wrong = newGame(5);
  while (!over(wrong)) wrong = answer(wrong, -1);
  assert.equal(correct(wrong), 0);
  assert.equal(grade(0), "C");
});
