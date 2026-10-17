import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HOLES,
  MAX_STROKES,
  NEW_ROUND,
  nextHole,
  onGreen,
  putt,
  roundOver,
  scorePutt,
  totals,
  type Hole,
  type Round,
  type Vec2,
} from "./minigolf.ts";

/** The best single putt from `from`, by a coarse search over aim and power. */
function bestPutt(hole: Hole, from: Vec2) {
  let best = { gap: Infinity, aim: 0, power: 0, holed: false };
  for (let aim = -1.6; aim <= 1.6; aim += 0.02)
    for (let power = 0; power <= 1; power += 0.05) {
      const r = putt(hole, from, { aim, power });
      const gap = Math.hypot(r.rest[0] - hole.cup[0], r.rest[1] - hole.cup[1]);
      if (r.holed) return { gap: 0, aim, power, holed: true };
      if (gap < best.gap) best = { gap, aim, power, holed: false };
    }
  return best;
}

test("every tee and cup is on its green", () => {
  for (const hole of HOLES) {
    assert.ok(onGreen(hole, hole.tee), hole.name);
    assert.ok(onGreen(hole, hole.cup), hole.name);
  }
});

test("the walls keep every putt on the green", () => {
  for (const hole of HOLES)
    for (let aim = -Math.PI; aim < Math.PI; aim += 0.4)
      for (const power of [0.2, 0.6, 1]) {
        const r = putt(hole, hole.tee, { aim, power });
        for (const f of r.frames)
          assert.ok(onGreen(hole, f), `${hole.name} ${aim} ${power}`);
      }
});

test("putts are deterministic", () => {
  const a = putt(HOLES[1], HOLES[1].tee, { aim: 0.1, power: 0.5 });
  const b = putt(HOLES[1], HOLES[1].tee, { aim: 0.1, power: 0.5 });
  assert.deepEqual(a.rest, b.rest);
});

test("every hole can be holed within par by good putts", () => {
  for (const hole of HOLES) {
    let from: Vec2 = hole.tee;
    let strokes = 0;
    let holed = false;
    while (!holed && strokes < hole.par) {
      const best = bestPutt(hole, from);
      const r = putt(hole, from, best);
      strokes++;
      holed = r.holed;
      from = r.rest;
    }
    assert.ok(holed, `${hole.name}: not holed in ${hole.par}`);
  }
});

test("a putt that's too hard runs over the cup", () => {
  const hole = HOLES[0];
  // straight down the middle at full power: too fast to drop
  const r = putt(hole, hole.tee, { aim: 0, power: 1 });
  assert.equal(r.holed, false);
});

test("a round scores strokes, picks up at the limit and totals against par", () => {
  let round: Round = NEW_ROUND;
  const miss = { rest: [0, -1] as Vec2, holed: false, frames: [] };
  const hit = { rest: HOLES[0].cup, holed: true, frames: [] };
  round = scorePutt(round, miss);
  round = scorePutt(round, hit);
  assert.equal(round.done, true);
  assert.deepEqual(totals(round), { strokes: 2, toPar: 0 });
  round = nextHole(round);
  for (let i = 0; i < MAX_STROKES; i++) round = scorePutt(round, miss);
  assert.equal(round.done, true);
  assert.equal(round.strokes[1], MAX_STROKES);
  round = nextHole(scorePutt(nextHole(round), hit));
  assert.equal(roundOver(round), true);
  assert.deepEqual(totals(round), { strokes: 9, toPar: 1 });
});
