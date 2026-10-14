import { test } from "node:test";
import assert from "node:assert/strict";
import {
  judge,
  comboMultiplier,
  pointsFor,
  nextCombo,
  coinsForScore,
  generateChart,
  findHittableNote,
  JUDGMENT_WINDOW_MS,
  DJ_BEAT_COUNT,
  DJ_MAX_SCORE,
  gradeFor,
  laneForKey,
  resultFor,
  tally,
  type Judgment,
} from "./engine.ts";

test("judge classifies hits by distance from the target time", () => {
  assert.equal(judge(0), "perfect");
  assert.equal(judge(45), "perfect");
  assert.equal(judge(-45), "perfect");
  assert.equal(judge(46), "great");
  assert.equal(judge(90), "great");
  assert.equal(judge(91), "good");
  assert.equal(judge(140), "good");
  assert.equal(judge(141), "miss");
  assert.equal(judge(-200), "miss");
});

test("judgment windows match the design spec", () => {
  assert.equal(JUDGMENT_WINDOW_MS.perfect, 45);
  assert.equal(JUDGMENT_WINDOW_MS.great, 90);
  assert.equal(JUDGMENT_WINDOW_MS.good, 140);
});

test("combo multiplier climbs one tier per 10 hits and caps at 4x", () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(9), 1);
  assert.equal(comboMultiplier(10), 2);
  assert.equal(comboMultiplier(20), 3);
  assert.equal(comboMultiplier(30), 4);
  assert.equal(comboMultiplier(1000), 4);
});

test("combo multiplier rejects invalid input", () => {
  assert.equal(comboMultiplier(-1), 1);
  assert.equal(comboMultiplier(Number.NaN), 1);
  assert.equal(comboMultiplier(1.5), 1);
});

test("a miss always resets the combo to zero", () => {
  assert.equal(nextCombo("miss", 12), 0);
});

test("non-miss hits extend the combo by one", () => {
  assert.equal(nextCombo("perfect", 0), 1);
  assert.equal(nextCombo("great", 9), 10);
  assert.equal(nextCombo("good", 5), 6);
});

test("points scale with judgment quality and the pre-hit combo multiplier", () => {
  assert.equal(pointsFor("perfect", 0), 100);
  assert.equal(pointsFor("perfect", 10), 200);
  assert.equal(pointsFor("great", 20), 210);
  assert.equal(pointsFor("good", 30), 160);
  assert.equal(pointsFor("miss", 30), 0);
});

test("coin reward is one coin per 20 score, floored", () => {
  assert.equal(coinsForScore(0), 0);
  assert.equal(coinsForScore(19), 0);
  assert.equal(coinsForScore(20), 1);
  assert.equal(coinsForScore(999), 49);
});

test("coinsForScore rejects invalid input", () => {
  assert.equal(coinsForScore(-5), 0);
  assert.equal(coinsForScore(Number.NaN), 0);
  assert.equal(coinsForScore(4.5), 0);
});

test("generateChart produces one note per beat on a deterministic lane cycle", () => {
  const chart = generateChart(4, 120);
  assert.equal(chart.length, 4);
  assert.deepEqual(
    chart.map((note) => note.lane),
    [0, 2, 1, 3],
  );
  assert.equal(chart[0].timeMs, 500);
  assert.equal(chart[3].timeMs, 2000);
});

test("generateChart rejects invalid beat counts", () => {
  assert.deepEqual(generateChart(0), []);
  assert.deepEqual(generateChart(-3), []);
});

test("findHittableNote returns the closest unhit note in the pressed lane", () => {
  const chart = generateChart(4, 120);
  const found = findHittableNote(chart, 2, new Set(), 1000);
  assert.equal(found?.id, 1);
});

test("findHittableNote ignores notes outside the Good window or already hit", () => {
  const chart = generateChart(4, 120);
  assert.equal(findHittableNote(chart, 0, new Set(), 10000), null);
  assert.equal(findHittableNote(chart, 0, new Set([0]), 500), null);
});

test("laneForKey maps D F J K in any case and the arrow keys", () => {
  assert.equal(laneForKey("d"), 0);
  assert.equal(laneForKey("F"), 1);
  assert.equal(laneForKey("j"), 2);
  assert.equal(laneForKey("K"), 3);
  assert.equal(laneForKey("ArrowLeft"), 0);
  assert.equal(laneForKey("ArrowRight"), 3);
  assert.equal(laneForKey("Escape"), null);
  assert.equal(laneForKey("arrowleft"), null);
});

test("tally resets the streak on a miss but keeps the peak", () => {
  assert.deepEqual(tally(["perfect", "perfect", "miss", "good"]), {
    score: 240,
    combo: 1,
    peakStreak: 2,
  });
  assert.deepEqual(tally([]), { score: 0, combo: 0, peakStreak: 0 });
});

test("a full perfect run hits the documented maximum score", () => {
  const run: Judgment[] = Array.from(
    { length: DJ_BEAT_COUNT },
    () => "perfect",
  );
  assert.equal(tally(run).score, DJ_MAX_SCORE);
  assert.deepEqual(resultFor(run, DJ_BEAT_COUNT), {
    score: DJ_MAX_SCORE,
    peakStreak: DJ_BEAT_COUNT,
    accuracy: 100,
    grade: "S",
  });
});

test("grade thresholds: S from 95, A from 85, B from 70, else C", () => {
  assert.equal(gradeFor(100), "S");
  assert.equal(gradeFor(95), "S");
  assert.equal(gradeFor(94), "A");
  assert.equal(gradeFor(85), "A");
  assert.equal(gradeFor(84), "B");
  assert.equal(gradeFor(70), "B");
  assert.equal(gradeFor(69), "C");
  assert.equal(gradeFor(0), "C");
});

test("resultFor counts unjudged notes as misses", () => {
  assert.deepEqual(resultFor(["perfect"], DJ_BEAT_COUNT), {
    score: 100,
    peakStreak: 1,
    accuracy: 3,
    grade: "C",
  });
  assert.equal(resultFor(["great", "good"], 2).accuracy, 55);
  assert.deepEqual(resultFor([], 0), {
    score: 0,
    peakStreak: 0,
    accuracy: 0,
    grade: "C",
  });
});
