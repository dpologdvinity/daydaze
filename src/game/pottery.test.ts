// Clay Day profiles: shaping, scoring, collapse and untrusted saved pieces.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TARGETS,
  freshClay,
  shapeClay,
  scorePot,
  thicknessAt,
  cleanPot,
  type Clay,
} from "./pottery.ts";

function targetClay(target: keyof typeof TARGETS): Clay {
  const t = TARGETS[target];
  return { left: [...t.radii], right: [...t.radii], height: t.height };
}

test("all target shapes score perfectly and have safe walls", () => {
  for (const target of ["bowl", "vase", "mug"] as const) {
    const clay = targetClay(target);
    assert.equal(scorePot(clay, target).score, 100);
    assert.equal(scorePot(clay, target).collapsed, false);
    assert.ok(thicknessAt(clay, 4) >= 0.035);
  }
});

test("shape, symmetry and height affect the score", () => {
  const clay = targetClay("bowl");
  assert.ok(scorePot(clay, "vase").score < 100);
  assert.ok(
    scorePot({ ...clay, right: clay.right.map((r) => r + 0.1) }, "bowl")
      .symmetry < 100,
  );
  assert.ok(scorePot({ ...clay, height: 0.8 }, "bowl").score < 100);
});

test("stretching a wall too thin collapses it and awards zero", () => {
  const clay = {
    left: Array<number>(8).fill(0.95),
    right: Array<number>(8).fill(0.95),
    height: 1.5,
  };
  assert.ok(thicknessAt(clay, 3) < 0.035);
  assert.equal(scorePot(clay, "bowl").collapsed, true);
  assert.equal(scorePot(clay, "bowl").score, 0);
});

test("shaping is immutable, bounded and rejects invalid bands and numbers", () => {
  const clay = freshClay();
  const before = structuredClone(clay);
  const next = shapeClay(clay, "left", 3, 0.65);
  assert.equal(next.left[3], 0.65);
  assert.deepEqual(clay, before);
  assert.equal(next.right[3], clay.right[3]);
  assert.equal(shapeClay(clay, "left", 0, 100).left[0], 0.95);
  assert.deepEqual(shapeClay(clay, "right", -1, 0.5), clay);
  assert.deepEqual(shapeClay(clay, "left", 2, NaN), clay);
  assert.notEqual(freshClay().left, freshClay().left);
});

test("invalid profiles cannot score or be saved", () => {
  for (const clay of [
    { ...freshClay(), height: NaN },
    { ...freshClay(), left: [] },
    { ...freshClay(), right: Array<number>(8).fill(Infinity) },
  ]) {
    assert.equal(scorePot(clay, "bowl").score, 0);
    assert.equal(cleanPot({ clay, target: "bowl", glaze: "#d58256" }), null);
  }
});

test("saved pieces are validated, copied and stripped of arbitrary fields", () => {
  const piece = {
    clay: targetClay("vase"),
    target: "vase",
    glaze: "#d58256",
    score: 9000,
  };
  const saved = cleanPot(piece);
  assert.ok(saved);
  assert.equal(saved.score, 100);
  assert.notEqual(saved.clay.left, piece.clay.left);
  for (const value of [
    null,
    {},
    { ...piece, target: "script" },
    { ...piece, glaze: "url(evil)" },
    { ...piece, clay: { ...piece.clay, height: 100 } },
    {
      ...piece,
      clay: {
        left: Array<number>(8).fill(0.95),
        right: Array<number>(8).fill(0.95),
        height: 1.5,
      },
    },
  ])
    assert.equal(cleanPot(value), null);
});
