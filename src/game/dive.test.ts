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
  ARCHES,
  terrainY,
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
  lifePose,
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
  assert.ok(LIFE_COUNT <= 64, `${LIFE_COUNT} creatures`);
});

test("the reef plan is seeded, dense, and clear of the spawn and the wreck", () => {
  const a = reefPlan();
  assert.deepEqual(a, reefPlan());
  assert.notDeepEqual(a, reefPlan(8));
  assert.ok(a.coral.length >= 40 && a.fans.length >= 60);
  assert.ok(a.kelp.length >= 150 && a.branches.length >= 30);
  assert.ok(a.jellies.length >= 4);
  const everything = [
    ...a.coral,
    ...a.fans,
    ...a.branches,
    ...a.kelp,
    ...a.jellies,
  ];
  for (const p of everything) {
    assert.ok(pointInPolygon(FLOOR, p.at));
    assert.ok(Math.hypot(p.at[0] - SPAWN[0], p.at[1] - SPAWN[1]) > 4);
    assert.ok(!atWreck(p.at));
  }
  assert.ok(a.coral.every((c) => c.kind >= 0 && c.kind < 6));
  // each arch brings two pillars and a lintel, and the lintel rides high
  const lintels = a.rocks.filter((r) => r.lift !== undefined);
  assert.equal(lintels.length, ARCHES.length);
  assert.ok(lintels.every((r) => (r.lift ?? 0) > 3));
});

test("the seabed is gently varied, level at the start, and never a cliff", () => {
  assert.equal(terrainY(SPAWN[0], SPAWN[1]), 0);
  assert.ok(Math.abs(terrainY(LADDER[0], LADDER[1])) < 0.05);
  let lo = 0;
  let hi = 0;
  for (let x = -22; x <= 22; x += 1)
    for (let z = -46; z <= 5; z += 1) {
      const h = terrainY(x, z);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      // a diver can swim over any step between neighbors
      assert.ok(Math.abs(terrainY(x + 1, z) - h) < 0.9);
      assert.ok(Math.abs(terrainY(x, z + 1) - h) < 0.9);
    }
  assert.ok(hi - lo > 1.2, "it is not flat");
  assert.ok(lo > -1.5 && hi < 3);
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

test("creatures circle their home, stay on the reef floor, and face the way they swim", () => {
  for (const life of LIFE)
    for (let i = 0; i < life.count; i++)
      for (let t = 0; t < 120; t += 7) {
        const p = lifePose(life, i, t);
        // the big swimmers range out past the diver's floor into the blue
        assert.ok(
          Math.abs(p.x) < 40 && p.z > -64 && p.z < 8,
          `${life.species} t${t}`,
        );
        assert.ok(p.above >= 0);
        const a = lifePose(life, i, t);
        const b = lifePose(life, i, t + 0.01);
        // the nose points the way it is going (yaw 0 faces +z)
        const heading = Math.atan2(b.x - a.x, b.z - a.z);
        const off = Math.atan2(
          Math.sin(heading - a.yaw),
          Math.cos(heading - a.yaw),
        );
        assert.ok(Math.abs(off) < 0.5, `${life.species} yaw off ${off}`);
      }
});
