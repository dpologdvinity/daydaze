import assert from "node:assert/strict";
import { test } from "node:test";
import {
  drop,
  height,
  newTower,
  PERFECT,
  sliderAt,
  SWEEP,
  top,
  towerScore,
  WIDTH,
} from "./macaronTower.ts";

test("a dead-center drop keeps the macaron whole and scores a perfect", () => {
  const r = drop(newTower(), PERFECT / 2);
  assert.equal(r.perfect, true);
  assert.equal(top(r.tower).width, WIDTH);
  assert.equal(towerScore(r.tower), 15);
});

test("an off-center drop trims the overhang", () => {
  const r = drop(newTower(), 0.3);
  assert.equal(r.perfect, false);
  assert.ok(Math.abs(top(r.tower).width - 0.7) < 1e-9);
  assert.ok(Math.abs(top(r.tower).x - 0.15) < 1e-9);
  // the next must land on the narrower one
  const next = drop(r.tower, 0.15 + 0.69);
  assert.equal(next.tower.over, true);
  assert.equal(height(next.tower), 1);
});

test("missing the tower ends it, and nothing more drops", () => {
  const r = drop(newTower(), 1.5);
  assert.equal(r.tower.over, true);
  assert.equal(drop(r.tower, 0).tower, r.tower);
});

test("the slider sweeps edge to edge and back", () => {
  const t = newTower();
  assert.equal(sliderAt(t, 0), -SWEEP);
  for (let s = 0; s < 10; s += 0.37) {
    const x = sliderAt(t, s);
    assert.ok(x >= -SWEEP - 1e-9 && x <= SWEEP + 1e-9);
  }
});
