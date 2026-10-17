import assert from "node:assert/strict";
import { test } from "node:test";
import { NEW_SHOOTOUT, scoreShot, shoot, spotFor, SPOTS } from "./hoops.ts";

test("a true shot from every spot drops", () => {
  for (const { at } of SPOTS) {
    const r = shoot(at, { aim: 0, power: 0.5 });
    assert.equal(r.made, true, `from ${at}`);
  }
});

test("too soft falls short and too hard clangs off the back", () => {
  for (const { at } of SPOTS) {
    assert.equal(
      shoot(at, { aim: 0, power: 0 }).made,
      false,
      `soft from ${at}`,
    );
    assert.equal(
      shoot(at, { aim: 0, power: 1 }).made,
      false,
      `hard from ${at}`,
    );
  }
});

test("a shot pulled wide misses", () => {
  assert.equal(shoot(SPOTS[2].at, { aim: 0.08, power: 0.5 }).made, false);
});

test("there's a window of touch either side of perfect", () => {
  const spot = SPOTS[2].at;
  const made = [0.4, 0.45, 0.5, 0.55, 0.6].filter(
    (power) => shoot(spot, { aim: 0, power }).made,
  );
  assert.ok(made.length >= 2, `made at ${made}`);
  assert.ok(made.length <= 4, `too easy: made at ${made}`);
});

test("shots are deterministic and play back from the hand", () => {
  const a = shoot(SPOTS[0].at, { aim: 0.01, power: 0.55 });
  const b = shoot(SPOTS[0].at, { aim: 0.01, power: 0.55 });
  assert.deepEqual(a.frames, b.frames);
  assert.ok(a.frames.length > 20);
});

test("the shootout rotates spots and counts the money ball as three", () => {
  let g = NEW_SHOOTOUT;
  const made = { made: true, kind: "swish" as const, frames: [] };
  for (let i = 0; i < SPOTS.length; i++) g = scoreShot(g, made);
  assert.equal(g.points, 13);
  assert.equal(g.made, 6);
  assert.deepEqual(spotFor(g), SPOTS[0]);
});
