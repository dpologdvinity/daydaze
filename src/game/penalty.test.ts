import assert from "node:assert/strict";
import { test } from "node:test";
import {
  goals,
  kick,
  KICKS,
  NEW_SHOOTOUT,
  scoreKick,
  seeded,
  shootoutOver,
} from "./penalty.ts";

test("the keeper's guesses are fixed by the seed", () => {
  const a = kick(7, 2, { direction: 0.7, power: 0.5 });
  const b = kick(7, 2, { direction: 0.7, power: 0.5 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(seeded(1)(), seeded(2)());
});

test("past the post is wide, and full power clears the bar", () => {
  assert.equal(kick(1, 0, { direction: 1.2, power: 0.5 }).outcome, "wide");
  assert.equal(kick(1, 0, { direction: 0.3, power: 1 }).outcome, "over");
});

test("a firm kick into the corner beats the keeper more often than not", () => {
  let scored = 0;
  let saved = 0;
  for (let seed = 0; seed < 200; seed++) {
    const r = kick(seed, 0, { direction: 0.8, power: 0.6 });
    if (r.outcome === "goal") scored++;
    if (r.outcome === "saved") saved++;
  }
  assert.ok(scored > 110, `scored ${scored} of 200`);
  assert.ok(saved > 20, `saved only ${saved} of 200`);
});

test("one down the middle is saved when the keeper stands tall", () => {
  const outcomes = new Set<string>();
  for (let seed = 0; seed < 60; seed++)
    outcomes.add(kick(seed, 1, { direction: 0, power: 0.4 }).outcome);
  assert.ok(outcomes.has("saved") && outcomes.has("goal"));
});

test("the flight runs from the spot to the line and on", () => {
  const r = kick(3, 0, { direction: -0.5, power: 0.5 });
  const [x0, y0, z0] = r.frames[0];
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(y0) < 1e-9 && z0 === 11);
  assert.ok(r.frames.some((f) => Math.abs(f[2]) < 0.4));
});

test("a shootout is five kicks", () => {
  let g = NEW_SHOOTOUT;
  for (let i = 0; i < KICKS + 2; i++)
    g = scoreKick(g, kick(5, i, { direction: 0.75, power: 0.55 }));
  assert.equal(g.results.length, KICKS);
  assert.equal(shootoutOver(g), true);
  assert.ok(goals(g) <= KICKS);
});
