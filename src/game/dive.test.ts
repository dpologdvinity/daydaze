import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon } from "./walk.ts";
import {
  AIR_SECONDS,
  FLOOR,
  GOAL,
  LADDER,
  LIFE,
  LIFE_COUNT,
  LOW_AIR,
  NEW_LOG,
  SPAWN,
  SPECIES,
  WRECK,
  airShare,
  atWreck,
  canSee,
  depthAt,
  drainPerSecond,
  exploreWreck,
  gaugeOf,
  mayDive,
  reefPlan,
  scoreOf,
  spot,
  stepAir,
} from "./dive.ts";

test("air drains faster the deeper she is, and never goes below zero", () => {
  assert.equal(drainPerSecond(0), 1);
  assert.equal(drainPerSecond(10), 2);
  assert.ok(drainPerSecond(18) > drainPerSecond(6));
  assert.equal(stepAir(AIR_SECONDS, 10, 1), AIR_SECONDS - 2);
  assert.equal(stepAir(1, 20, 5), 0);
});

test("the gauge warns low, then out; the needle is a clamped share", () => {
  assert.equal(gaugeOf(AIR_SECONDS), "ok");
  assert.equal(gaugeOf(LOW_AIR), "low");
  assert.equal(gaugeOf(0), "out");
  assert.equal(airShare(AIR_SECONDS * 2), 1);
  assert.equal(airShare(-3), 0);
});

test("a fresh tank lasts a few minutes at the reef's depths", () => {
  let air = AIR_SECONDS;
  let t = 0;
  while (air > 0) {
    air = stepAir(air, depthAt(0, SPAWN[1] - 20), 1);
    t++;
  }
  assert.ok(t > 80 && t < 200, `tank lasted ${t} s`);
});

test("the reef deepens going out and stays on a real floor", () => {
  assert.ok(depthAt(0, -40) > depthAt(0, SPAWN[1]));
  for (const p of [SPAWN, LADDER, WRECK.at])
    assert.ok(pointInPolygon(FLOOR, p));
  for (const l of LIFE) assert.ok(pointInPolygon(FLOOR, l.at), l.species);
});

test("every life is a known species, and every species is somewhere", () => {
  const ids = SPECIES.map((s) => s.id);
  for (const l of LIFE) assert.ok(ids.includes(l.species), l.species);
  for (const id of ids)
    assert.ok(
      LIFE.some((l) => l.species === id),
      id,
    );
  assert.ok(ids.length > GOAL + 4, "more kinds than the goal asks for");
});

test("the reef stays inside the low-tier creature budget", () => {
  assert.ok(LIFE_COUNT <= 40, `${LIFE_COUNT} creatures`);
});

test("the reef plan is seeded, scattered and clear of the spawn and the wreck", () => {
  const a = reefPlan();
  assert.deepEqual(a, reefPlan());
  assert.notDeepEqual(a, reefPlan(8));
  assert.ok(a.coral.length >= 20 && a.kelp.length >= 30);
  for (const p of [...a.coral, ...a.kelp]) {
    assert.ok(pointInPolygon(FLOOR, p.at));
    assert.ok(Math.hypot(p.at[0] - SPAWN[0], p.at[1] - SPAWN[1]) > 4);
    assert.ok(!atWreck(p.at));
  }
  assert.ok(a.coral.every((c) => c.kind >= 0 && c.kind < 6));
});

test("sightings: in front and in range only", () => {
  // yaw 0 faces +z
  assert.ok(canSee([0, 0], 0, [0, 5]));
  assert.ok(!canSee([0, 0], 0, [0, -5]), "behind her");
  assert.ok(!canSee([0, 0], 0, [0, 20]), "too far");
  assert.ok(canSee([0, 0], Math.PI, [0, -5]), "turned round");
  assert.ok(!canSee([0, 0], 0, [8, 0.5]), "off to the side");
  assert.ok(canSee([0, 0], 0, [0.1, 0.1]), "nose to nose");
});

test("the log counts each species once and the wreck for two", () => {
  let log = spot(NEW_LOG, "turtle");
  log = spot(log, "turtle");
  log = spot(log, "shark");
  assert.equal(scoreOf(log), 2);
  log = exploreWreck(exploreWreck(log));
  assert.equal(scoreOf(log), 4);
  assert.equal(scoreOf(NEW_LOG), 0);
});

test("the wreck zone, and the gear check for the reef", () => {
  assert.ok(atWreck(WRECK.at));
  assert.ok(!atWreck([20, 0]));
  assert.ok(!mayDive("reef-dive", false));
  assert.ok(mayDive("reef-dive", true));
  assert.ok(mayDive("city", false));
});
