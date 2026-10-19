import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aimAt,
  BALLS,
  gameOver,
  landing,
  newGame,
  powerAt,
  roll,
  total,
} from "./skeeBall.ts";

test("soft rolls land low, a firm straight one finds the 50", () => {
  assert.equal(landing(0, 0.1), 0);
  assert.equal(landing(0, 0.4), 10);
  assert.equal(landing(0, 0.8), 40);
  assert.equal(landing(0.5, 0.8), 20);
  assert.equal(landing(0.1, 0.9), 50);
});

test("a hard roll angled to a corner sinks the 100, straight it bounces out", () => {
  assert.equal(landing(-0.9, 0.97), 100);
  assert.equal(landing(0.9, 0.97), 100);
  assert.equal(landing(0, 0.97), 10);
});

test("a game is nine balls, totaled", () => {
  let g = newGame();
  for (let i = 0; i < BALLS + 2; i++) g = roll(g, 0.1, 0.9);
  assert.ok(gameOver(g));
  assert.equal(g.rolls.length, BALLS);
  assert.equal(total(g), 50 * BALLS);
});

test("the meters stay in range", () => {
  for (let s = 0; s < 20; s += 0.13) {
    assert.ok(Math.abs(aimAt(s)) <= 1);
    const p = powerAt(s);
    assert.ok(p >= 0 && p <= 1);
  }
});
