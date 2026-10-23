import assert from "node:assert/strict";
import test from "node:test";
import {
  BEST_BONUS,
  beats,
  cleanBests,
  gradeFor,
  PRIZE_GAMES,
  PRIZE_TABLES,
  prizeFor,
} from "./prizes.ts";

test("scores grade S to C against each game's bars", () => {
  assert.equal(gradeFor("penalties", 5), "S");
  assert.equal(gradeFor("penalties", 4), "A");
  assert.equal(gradeFor("penalties", 3), "B");
  assert.equal(gradeFor("penalties", 0), "C");
  assert.equal(gradeFor("gymnastics", 11.2), "S");
  assert.equal(gradeFor("gymnastics", 8.5), "C");
});

test("mini golf grades and bests count lower as better", () => {
  assert.equal(gradeFor("mini-golf", -3), "S");
  assert.equal(gradeFor("mini-golf", 0), "A");
  assert.equal(gradeFor("mini-golf", 2), "B");
  assert.equal(gradeFor("mini-golf", 6), "C");
  assert.equal(beats("mini-golf", -1, 0), true);
  assert.equal(beats("mini-golf", 1, 0), false);
});

test("every game's bars run from S down to B", () => {
  for (const game of PRIZE_GAMES) {
    const { grades, lower } = PRIZE_TABLES[game];
    const [s, a, b] = lower ? grades.map((g) => -g) : grades;
    assert.ok(s >= a && a >= b, game);
  }
});

test("a first score and a new best pay the bonus; a worse one doesn't", () => {
  const first = prizeFor("hoops", 10);
  assert.equal(first.best, true);
  assert.equal(first.coins, 12 + BEST_BONUS);
  const worse = prizeFor("hoops", 8, 10);
  assert.deepEqual([worse.best, worse.coins], [false, 12]);
  assert.equal(prizeFor("hoops", 10, 10).best, false);
});

test("bests from storage keep only known games with finite scores", () => {
  assert.deepEqual(
    cleanBests({ hoops: 14, skate: "lots", moon: 3, bowling: Infinity }),
    { hoops: 14 },
  );
  assert.deepEqual(cleanBests(null), {});
  assert.deepEqual(cleanBests([1, 2]), {});
});

test("races grade on finishing place, lower is better", () => {
  for (const game of ["speedway", "jet-ski"] as const) {
    assert.equal(gradeFor(game, 1), "S");
    assert.equal(gradeFor(game, 2), "A");
    assert.equal(gradeFor(game, 3), "B");
    assert.equal(gradeFor(game, 6), "C");
    assert.equal(beats(game, 1, 2), true);
  }
  assert.equal(PRIZE_TABLES.speedway.format(1), "1st place");
  assert.equal(PRIZE_TABLES["jet-ski"].format(3), "3rd place");
});

test("bumper cars, the Midway booths and the arcade cabinets have prizes", () => {
  for (const game of [
    "bumper-cars",
    "midway-whack",
    "midway-gallery",
    "midway-squirt",
    "midway-rings",
    "gem-glam",
    "star-siege",
    "trivia",
    "cook-off",
    "volleyball",
    "range-pistol",
    "range-rifle",
    "cliff-dive",
    "speed-slide",
    "pool-volleyball",
    "water-guns",
  ] as const)
    assert.ok(PRIZE_GAMES.includes(game), game);
});
