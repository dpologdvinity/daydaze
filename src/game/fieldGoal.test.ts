import assert from "node:assert/strict";
import { test } from "node:test";
import {
  kick,
  KICKS,
  made,
  NEW_SERIES,
  scoreKick,
  seriesOver,
} from "./fieldGoal.ts";

/** The aim that cancels the wind, found by search: the kick's best line. */
function bestAim(distance: number, wind: number, power: number): number {
  let best = 0;
  let bestX = Infinity;
  for (let aim = -0.14; aim <= 0.14; aim += 0.002) {
    const f = kick(distance, wind, { aim, power }).frames;
    const cross = f.find((p) => p[2] <= 0) ?? f[f.length - 1];
    if (Math.abs(cross[0]) < bestX) {
      bestX = Math.abs(cross[0]);
      best = aim;
    }
  }
  return best;
}

test("every kick is makeable with the right aim and enough leg", () => {
  for (const { distance, wind } of KICKS) {
    const aim = bestAim(distance, wind, 0.8);
    assert.equal(
      kick(distance, wind, { aim, power: 0.8 }).result,
      "good",
      `${distance} m`,
    );
  }
});

test("a soft kick from long range comes up short", () => {
  assert.equal(kick(46, 0, { aim: 0, power: 0.1 }).result, "short");
});

test("the wind carries a straight kick wide", () => {
  assert.equal(kick(46, -3, { aim: 0, power: 0.6 }).result, "wide-left");
  assert.equal(kick(41, 2.5, { aim: 0, power: 0.6 }).result, "wide-right");
});

test("a series is five kicks, scored as made", () => {
  let s = NEW_SERIES;
  for (let i = 0; i < 7; i++)
    s = scoreKick(s, kick(18, 0, { aim: 0, power: 0.7 }));
  assert.equal(s.results.length, 5);
  assert.equal(seriesOver(s), true);
  assert.equal(made(s), 5);
});
