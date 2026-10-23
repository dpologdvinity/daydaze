import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BACK_X,
  BUTTON_X,
  endOver,
  endScore,
  newEnd,
  pointsAt,
  rest,
  slide,
  STONES,
} from "./curling.ts";

const settle = (aim: number, weight: number, sweeps: number[] = []) =>
  slide({ aim, weight }, sweeps, 60);

test("a stone slows to a stop, and more weight goes further", () => {
  const soft = settle(0, 0.2);
  const firm = settle(0, 0.5);
  assert.ok(soft.stopped && firm.stopped);
  assert.ok(firm.x > soft.x);
  // too hard and it's out the back
  assert.ok(settle(0, 1).x > BACK_X);
});

test("there's a weight that reaches the house, and sweeping carries further", () => {
  const draws = Array.from({ length: 101 }, (_, i) => i / 100).filter(
    (w) => pointsAt(settle(-0.3, w).x, settle(-0.3, w).z) >= 3,
  );
  assert.ok(draws.length > 0, "some weight finds the 4-foot");
  const plain = settle(0, 0.3);
  const swept = settle(0, 0.3, [1, 1.5, 2, 2.5, 3]);
  assert.ok(swept.x > plain.x + 0.3);
});

test("rings score inside out, and an end is six stones", () => {
  assert.equal(pointsAt(BUTTON_X, 0), 4);
  assert.equal(pointsAt(BUTTON_X + 0.5, 0), 3);
  assert.equal(pointsAt(BUTTON_X, 1.5), 1);
  assert.equal(pointsAt(BUTTON_X - 3, 0), 0);
  let e = newEnd();
  for (let i = 0; i < STONES; i++)
    e = rest(e, { x: BUTTON_X, z: 0, speed: 0, stopped: true });
  assert.ok(endOver(e));
  assert.equal(endScore(e), 24);
});
