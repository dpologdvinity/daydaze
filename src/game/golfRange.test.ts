import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addShot,
  BALLS,
  bucketEmpty,
  bucketScore,
  hit,
  NEW_BUCKET,
  TARGETS,
} from "./golfRange.ts";

/** The power that lands a pure strike nearest a target's middle. */
function powerFor(z: number): number {
  let best = 0;
  let gap = Infinity;
  for (let p = 0; p <= 1; p += 0.005) {
    const g = Math.abs(hit({ power: p, strike: 0 }).rest[1] - z);
    if (g < gap) {
      gap = g;
      best = p;
    }
  }
  return best;
}

test("every target can be found with a pure strike at the right power", () => {
  for (const [i, t] of TARGETS.entries()) {
    const shot = hit({ power: powerFor(t.at[1]), strike: 0 });
    assert.equal(shot.target, i, `target ${i}`);
    assert.ok(shot.points > 0);
  }
});

test("a mishit goes shorter and bends: early left, late right", () => {
  const pure = hit({ power: 0.8, strike: 0 });
  const early = hit({ power: 0.8, strike: -0.8 });
  const late = hit({ power: 0.8, strike: 0.8 });
  assert.ok(early.rest[1] < pure.rest[1] && late.rest[1] < pure.rest[1]);
  assert.ok(early.rest[0] < -5 && late.rest[0] > 5);
});

test("a bucket is ten balls and adds up their points", () => {
  let b = NEW_BUCKET;
  for (let i = 0; i < BALLS + 3; i++)
    b = addShot(b, hit({ power: 0.25, strike: 0 }));
  assert.equal(b.shots.length, BALLS);
  assert.equal(bucketEmpty(b), true);
  assert.equal(
    bucketScore(b),
    b.shots.reduce((s, x) => s + x.points, 0),
  );
});
