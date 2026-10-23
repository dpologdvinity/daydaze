import assert from "node:assert/strict";
import { test } from "node:test";
import {
  grab,
  inReach,
  newRound,
  onBelt,
  plateKind,
  plateX,
  PLATES,
  REACH,
  ROUND_SECONDS,
  SEAT_X,
  travel,
} from "./sushiCatch.ts";

/** The first time plate `n` sits right in front of the seat. */
function arrival(n: number): number {
  let lo = 0;
  let hi = ROUND_SECONDS;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (plateX(n, mid) < SEAT_X) lo = mid;
    else hi = mid;
  }
  return hi;
}

test("the belt speeds up, and plates ride it in order", () => {
  assert.ok(travel(20) - travel(10) > travel(10) - travel(0));
  assert.ok(plateX(0, 5) > plateX(1, 5));
  const { first, last } = onBelt(30);
  assert.ok(first <= last);
  assert.ok(
    new Set(Array.from({ length: 60 }, (_, n) => plateKind(1, n))).size ===
      PLATES.length,
  );
});

test("a plate is in reach only as it passes the seat", () => {
  const r = newRound(4);
  const t = arrival(3);
  assert.equal(inReach(r, t), 3);
  // seconds earlier it was still far up the belt
  assert.notEqual(inReach(r, t - 3), 3);
  assert.ok(Math.abs(plateX(3, t) - SEAT_X) <= REACH);
});

test("the right plate scores, a wrong one costs, a full ticket pays a bonus", () => {
  const seed = 11;
  let r = newRound(seed);
  // find plates on the belt that the ticket wants, and one it doesn't
  let wrongDone = false;
  for (let n = 0; n < 400 && r.ticket === 0; n++) {
    const kind = plateKind(seed, n);
    const wanted = r.wanted.includes(kind);
    if (!wanted && (wrongDone || r.score < 5)) continue;
    const before = r.score;
    const g = grab(r, arrival(n));
    assert.equal(g.got, kind);
    r = g.round;
    if (wanted) assert.ok(r.score >= before + 10);
    else {
      assert.equal(r.score, before - 5);
      wrongDone = true;
    }
  }
  assert.equal(r.ticket, 1, "the first ticket gets filled");
  assert.equal(r.right, 3);
  assert.equal(r.wanted.length, 3);
  // a grabbed plate is gone; grabbing at nothing changes nothing
  const last = r.taken.at(-1) ?? 0;
  assert.equal(inReach(r, arrival(last)), null);
  assert.equal(grab(r, arrival(last)).round, r);
  assert.equal(grab(r, ROUND_SECONDS).round, r);
});
