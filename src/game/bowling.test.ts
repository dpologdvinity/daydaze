import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bowl,
  clampThrow,
  frameTotals,
  marks,
  freshRack,
  NEW_GAME,
  PIN_SPOTS,
  position,
  roll,
  type Game,
} from "./bowling.ts";

const ALL = PIN_SPOTS.map(() => true);
const play = (pins: number[]): Game => pins.reduce(bowl, NEW_GAME);

test("the rack is ten pins in a triangle, headpin first", () => {
  assert.equal(PIN_SPOTS.length, 10);
  assert.equal(PIN_SPOTS[0][0], 0);
  assert.ok(PIN_SPOTS.every(([, z]) => z >= PIN_SPOTS[0][1]));
});

test("a ball off the lane drops into the gutter and touches nothing", () => {
  const r = roll(ALL, { offset: 0.45, angle: 0.03, speed: 8, hook: 0.5 });
  assert.equal(r.gutter, true);
  assert.deepEqual(r.knocked, []);
});

test("a ball into the pocket knocks most of the rack down", () => {
  // from right of centre, angled in, curling into the 1-3 pocket
  const r = roll(ALL, { offset: 0.3, angle: -0.012, speed: 8, hook: -0.25 });
  assert.equal(r.gutter, false);
  assert.ok(r.knocked.length >= 7, `knocked ${r.knocked.length}`);
});

test("rolls are deterministic and leave fallen pins out", () => {
  const t = { offset: 0.1, angle: 0, speed: 7, hook: 0 };
  assert.deepEqual(roll(ALL, t).knocked, roll(ALL, t).knocked);
  const fewer = ALL.map((_, i) => i !== 0);
  assert.ok(!roll(fewer, t).knocked.includes(0));
});

test("playback snapshots run from the release to the settle", () => {
  const r = roll(ALL, { offset: 0, angle: 0, speed: 8, hook: 0 });
  assert.ok(r.frames.length > 30);
  assert.ok(r.frames[0].ball[1] < 0.05);
  assert.equal(r.frames[0].pins.length, 10);
});

test("throws are held to what a person can bowl", () => {
  const t = clampThrow({ offset: 9, angle: -9, speed: Number.NaN, hook: 99 });
  assert.equal(t.offset, 0.45);
  assert.equal(t.angle, -0.03);
  assert.equal(t.speed, 5);
  assert.equal(t.hook, 1.4);
});

test("scores: a perfect game, all spares and all gutters", () => {
  assert.equal(frameTotals(play(Array(12).fill(10)))[9], 300);
  assert.equal(frameTotals(play(Array(21).fill(5)))[9], 150);
  assert.equal(frameTotals(play(Array(20).fill(0)))[9], 0);
  assert.equal(position(play(Array(12).fill(10))).over, true);
  assert.equal(position(play(Array(20).fill(0))).over, true);
});

test("a strike or spare waits on its bonus balls", () => {
  assert.deepEqual(frameTotals(play([10, 3])), [null, null]);
  assert.deepEqual(frameTotals(play([10, 3, 4])), [17, 24]);
  assert.deepEqual(frameTotals(play([7, 3, 5])), [15, null]);
});

test("frames rack fresh pins after a strike or the second ball", () => {
  assert.equal(freshRack(NEW_GAME), true);
  assert.equal(freshRack(play([7])), false);
  assert.equal(freshRack(play([7, 2])), true);
  assert.equal(freshRack(play([10])), true);
  // the tenth: a strike racks again, and so does a spare
  const nine = Array(18).fill(0);
  assert.equal(freshRack(play([...nine, 10])), true);
  assert.equal(freshRack(play([...nine, 10, 4])), false);
  assert.equal(freshRack(play([...nine, 6, 4])), true);
  assert.equal(position(play([...nine, 6, 3])).over, true);
});

test("impossible counts are refused", () => {
  assert.deepEqual(play([7, 5]).rolls, [7]);
  assert.deepEqual(play([11]).rolls, []);
  assert.deepEqual(play([-1]).rolls, []);
});

test("the scoreboard marks strikes, spares and misses", () => {
  assert.deepEqual(marks(play([10, 7, 3, 0, 5])), [
    ["X"],
    ["7", "/"],
    ["-", "5"],
  ]);
  const nine = Array(18).fill(0);
  assert.deepEqual(marks(play([...nine, 10, 10, 4])).at(-1), ["X", "X", "4"]);
  assert.deepEqual(marks(play([...nine, 6, 4, 10])).at(-1), ["6", "/", "X"]);
});
