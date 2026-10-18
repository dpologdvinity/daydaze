import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARENA,
  clearLine,
  COVER,
  newRound,
  popOut,
  RIVALS,
  rivalAt,
  ROUND_SECONDS,
  roundOver,
  roundScore,
  shoot,
  SPAWN,
  stepRound,
  type Round,
} from "./laserTag.ts";
import { pointInPolygon, type Vec2 } from "./walk.ts";

const inBox = (p: Vec2) =>
  COVER.some((c) => p[0] > c.x0 && p[0] < c.x1 && p[1] > c.z0 && p[1] < c.z1);

test("cover blocks a line through it; open floor doesn't", () => {
  assert.equal(clearLine([0, 3], [0, -3]), false); // through the middle wall
  assert.equal(clearLine([-9, 6], [9, 6]), true);
});

test("every rival hides behind cover from the spawn and peeks out in the open", () => {
  for (const r of RIVALS) {
    assert.ok(!inBox(r.hide) && !inBox(r.peek));
    assert.equal(clearLine(SPAWN, r.hide), false, `hide ${r.hide} is visible`);
    assert.ok(
      pointInPolygon(
        [
          [ARENA.x0, ARENA.z0],
          [ARENA.x1, ARENA.z0],
          [ARENA.x1, ARENA.z1],
          [ARENA.x0, ARENA.z1],
        ],
        r.peek,
      ),
    );
  }
});

/** The round advanced to rival i's first moment out in the open. */
function whenOut(seed: number, i: number): Round {
  let r = newRound(seed);
  while (!popOut(seed, i, r.t).out) r = { ...r, t: r.t + 0.05 };
  return r;
}

test("a rival out in the open with a clear line is tagged and goes down", () => {
  const seed = 7;
  const r = whenOut(seed, 0);
  const peek = RIVALS[0]?.peek ?? [0, 0];
  const you: Vec2 = [peek[0], peek[1] + 3];
  assert.ok(clearLine(you, peek));
  const { round, shot } = shoot(r, 0, you);
  assert.equal(shot, "tag");
  assert.equal(round.tags, 1);
  assert.equal(rivalAt(round, 0).open, false);
  // the blaster recharges before the next shot
  assert.equal(shoot(round, 0, you).shot, "recharging");
});

test("a hidden rival can't be tagged", () => {
  let r = newRound(7);
  while (popOut(7, 1, r.t).out || r.t < 0.5) r = { ...r, t: r.t + 0.05 };
  assert.equal(shoot(r, 1, [0, 6]).shot, "miss");
});

test("rivals fire back once per pop-out, only with a clear line", () => {
  let open = newRound(3);
  let hidden = newRound(3);
  for (let i = 0; i < 1300; i++) {
    open = stepRound(open, 0.05, [0, 6]);
    // tucked into the corner behind the middle wall, out of every line
    hidden = stepRound(hidden, 0.05, [0, -0.8]);
  }
  assert.ok(roundOver(open));
  assert.equal(open.t, ROUND_SECONDS);
  assert.ok(open.hits > 0);
  assert.ok(open.hits <= open.fired.reduce((n, w) => n + w + 1, 0));
  assert.ok(hidden.hits <= open.hits);
});

test("the score is tags less hits, never below zero", () => {
  assert.equal(roundScore({ ...newRound(1), tags: 5, hits: 2 }), 400);
  assert.equal(roundScore({ ...newRound(1), tags: 0, hits: 3 }), 0);
});
