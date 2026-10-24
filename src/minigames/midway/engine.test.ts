import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FILL_RATE,
  onTarget,
  rivalAt,
  SQUIRT_SECONDS,
  squirtScore,
  squirtTarget,
  CORKS,
  HOLES,
  LEVELS,
  RINGS,
  WHACK_SECONDS,
  galleryTargets,
  grade,
  meters,
  moleSchedule,
  shoot,
  targetX,
  toss,
  whack,
} from "./engine.ts";

test("mole schedules replay exactly and never double up a hole", () => {
  for (const { id } of LEVELS) {
    const a = moleSchedule(id, 42);
    assert.deepEqual(a, moleSchedule(id, 42));
    for (const m of a) {
      assert.ok(m.hole >= 0 && m.hole < HOLES);
      assert.ok(m.up < m.down && m.down <= WHACK_SECONDS + 1);
      for (const other of a)
        if (other !== m && other.hole === m.hole)
          assert.ok(other.down <= m.up || other.up >= m.down, "overlap");
    }
  }
});

test("harder whack-a-mole sends more moles", () => {
  const easy = moleSchedule("easy", 7).length;
  const hard = moleSchedule("hard", 7).length;
  assert.ok(hard > easy * 1.4, `${easy} vs ${hard}`);
});

test("a mole is hit once, only while it is up", () => {
  const moles = moleSchedule("easy", 3);
  const m = moles[0];
  assert.equal(whack(moles, m.hole, m.up - 0.1), "miss");
  const mid = (m.up + m.down) / 2;
  assert.equal(whack(moles, m.hole, mid), m.golden ? "golden" : "hit");
  assert.equal(whack(moles, m.hole, mid), "miss");
});

test("gallery targets wrap and a cork pops only what it touches", () => {
  const targets = galleryTargets("medium", 9);
  for (const t of targets)
    for (const time of [0, 3.7, 19, 55]) {
      const x = targetX(t, time);
      assert.ok(x >= 0 && x < 1);
    }
  const target = targets[4];
  const x = targetX(target, 2);
  assert.equal(shoot(targets, "medium", target.lane, (x + 0.3) % 1, 2), null);
  assert.equal(shoot(targets, "medium", target.lane, x, 2)?.id, target.id);
  assert.notEqual(shoot(targets, "medium", target.lane, x, 2)?.id, target.id);
});

test("a cleared gallery restocks", () => {
  const targets = galleryTargets("easy", 1);
  for (const t of targets) t.hit = true;
  targets[0].hit = false;
  shoot(targets, "easy", targets[0].lane, targetX(targets[0], 0), 0);
  assert.ok(targets.every((t) => !t.hit));
});

test("harder levels give fewer corks", () => {
  assert.ok(CORKS.easy > CORKS.medium && CORKS.medium > CORKS.hard);
});

test("ring toss: a dead-center throw rings, the edge misses", () => {
  // the center of the middle bottle's cell
  const hit = toss("hard", 0.5, 0.5);
  assert.deepEqual(hit.ringer, [1, 1]);
  assert.equal(hit.points, 20);
  assert.equal(toss("hard", 1 / 3, 0.5).ringer, null);
  assert.equal(toss("easy", 0.5, 1.01).ringer, null);
  // back row pays the most
  assert.equal(toss("easy", 0.5, 5 / 6).points, 30);
  assert.ok(RINGS > 0);
});

test("meters swing through their full range", () => {
  let lo = 1;
  let hi = 0;
  for (let t = 0; t < 4; t += 0.01) {
    const { aim, power } = meters("medium", t);
    lo = Math.min(lo, aim, power);
    hi = Math.max(hi, aim, power);
  }
  assert.ok(lo < 0.01 && hi > 0.99);
});

test("grades climb with the score", () => {
  assert.equal(grade("whack", "easy", 0), "C");
  assert.equal(grade("whack", "easy", 10_000), "S");
  assert.equal(grade("rings", "hard", 60), "A");
});

test("the water-gun race: aim on the bullseye wins, rivals keep a steady pace", async () => {
  const {
    squirtTarget,
    onTarget,
    rivalAt,
    squirtScore,
    FILL_RATE,
    SQUIRT_SECONDS,
  } = await import("./engine.ts");
  const t0 = squirtTarget("medium", 7, 3);
  assert.ok(onTarget("medium", t0, t0));
  assert.equal(onTarget("medium", { x: t0.x + 0.2, y: t0.y }, t0), false);
  // a board height is half a width: the same miss counts less up and down
  assert.ok(onTarget("medium", { x: t0.x, y: t0.y + 0.1 }, t0));
  assert.equal(onTarget("medium", { x: t0.x + 0.1, y: t0.y }, t0), false);
  // a perfect stream beats every rival to the top
  const win = 1 / FILL_RATE;
  for (let i = 0; i < 3; i++) assert.ok(rivalAt("hard", 7, i, win) < 1);
  // and a rival does finish inside the race's time
  assert.ok(rivalAt("easy", 7, 2, SQUIRT_SECONDS) >= 1);
  assert.equal(squirtScore(1, true), 150);
  assert.equal(squirtScore(0.4, false), 40);
});

test("the water-gun bullseye drifts inside the board, the same for a seed", () => {
  for (const level of ["easy", "medium", "hard"] as const)
    for (let t = 0; t < SQUIRT_SECONDS; t += 0.7) {
      const at = squirtTarget(level, 42, t);
      assert.ok(at.x > 0 && at.x < 1 && at.y > 0 && at.y < 1);
      assert.deepEqual(at, squirtTarget(level, 42, t));
    }
});

test("the stream is on target inside the bullseye, tighter on hard", () => {
  const target = { x: 0.5, y: 0.5 };
  assert.equal(onTarget("easy", target, target), true);
  const nearEdge = { x: 0.56, y: 0.5 };
  assert.equal(onTarget("easy", nearEdge, target), true);
  assert.equal(onTarget("hard", nearEdge, target), false);
  // the board is twice as wide as tall: a vertical miss counts half
  assert.equal(onTarget("easy", { x: 0.5, y: 0.62 }, target), true);
});

test("rivals run steadily from 0 toward 1 and never past it", () => {
  for (let i = 0; i < 3; i++) {
    assert.ok(rivalAt("medium", 7, i, 0) <= 0.05);
    assert.ok(rivalAt("medium", 7, i, 10) > rivalAt("medium", 7, i, 2));
    assert.equal(rivalAt("hard", 7, i, 1e4), 1);
  }
  // a perfect stream fills faster than any rival's pace
  assert.ok(FILL_RATE * 5 > rivalAt("hard", 7, 2, 5));
});

test("the race scores how far you ran, plus 50 for winning", () => {
  assert.equal(squirtScore(0.5, false), 50);
  assert.equal(squirtScore(1.4, true), 150);
  assert.equal(squirtScore(0, false), 0);
});
