import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flightOver,
  flightScore,
  GLASSES,
  LINE,
  levelAfter,
  newFlight,
  pointsFor,
  pour,
  WINES,
  winesFor,
} from "./winePour.ts";

test("on the line scores 100, off it less, over the rim nothing", () => {
  assert.equal(pointsFor(LINE), 100);
  assert.ok(pointsFor(LINE + 0.05) < 100 && pointsFor(LINE + 0.05) > 70);
  assert.equal(pointsFor(1.2), 0);
  assert.equal(pointsFor(0), 0);
});

test("each wine pours at its own speed", () => {
  assert.notEqual(levelAfter(0, 1), levelAfter(4, 1));
  assert.equal(levelAfter(1, 0), 0);
});

test("a perfect flight is five glasses on the line", () => {
  let f = newFlight();
  for (let g = 0; g < GLASSES + 1; g++)
    f = pour(f, LINE / (WINES[g % WINES.length]?.speed ?? 1));
  assert.ok(flightOver(f));
  assert.equal(f.pours.length, GLASSES);
  assert.equal(flightScore(f), 500);
});

test("the flight pours wines at 18+ and juices at 13+", () => {
  assert.ok(winesFor("adult").some((w) => w.name === "Lambrusco"));
  assert.equal(
    winesFor("teen").some((w) => /Lambrusco|Sangiovese|rosé/.test(w.name)),
    false,
  );
});
