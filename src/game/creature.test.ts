import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newWanderer,
  stepWanderer,
  turnToward,
  type Wanderer,
} from "./creature.ts";

test("a visitor nearby makes the animal alert, and it stays put", () => {
  const w = newWanderer(1);
  w.mood = "walk";
  w.timer = 5;
  stepWanderer(w, 0.1, true, 1, () => 0.5);
  assert.equal(w.mood, "alert");
  assert.equal(w.a, 1);
});

test("an alert animal settles back to idle once the visitor leaves", () => {
  const w = newWanderer(0);
  stepWanderer(w, 0.1, true, 1, () => 0.5);
  stepWanderer(w, 1.5, false, 1, () => 0.5);
  assert.equal(w.mood, "idle");
});

test("idle turns into a walk or a meal, and walking moves along the loop", () => {
  const w: Wanderer = newWanderer(0);
  stepWanderer(w, 0.01, false, 2, () => 0.1);
  assert.equal(w.mood, "walk");
  const t0 = w.timer;
  stepWanderer(w, 1, false, 2, () => 0.1);
  assert.equal(w.a, 2);
  assert.ok(w.timer < t0);
  const eater = newWanderer(0);
  stepWanderer(eater, 0.01, false, 2, () => 0.9);
  assert.equal(eater.mood, "eat");
  stepWanderer(eater, 10, false, 2, () => 0.9);
  assert.equal(eater.a, 0);
});

test("turnToward takes the short way round and never overshoots", () => {
  assert.equal(turnToward(0, 1, 2), 1);
  assert.ok(Math.abs(turnToward(3, -3, 0.1) - 3.1) < 1e-9);
  assert.equal(turnToward(0, -0.5, 0.2), -0.2);
});
