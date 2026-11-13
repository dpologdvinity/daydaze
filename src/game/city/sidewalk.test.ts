import assert from "node:assert/strict";
import { test } from "node:test";
import { onSidewalk } from "./sidewalk.ts";
import { CITY_SPAWN, CITY_SURFACES } from "./layout.ts";

test("a sidewalk strip's middle is on the sidewalk, the road beside it and the sea are not", () => {
  const road = CITY_SURFACES.find((s) => s.kind === "road");
  const walk = CITY_SURFACES.find((s) => s.kind === "sidewalk");
  assert.ok(road && walk);
  const mid = (p: readonly (readonly [number, number])[]) => [
    p.reduce((n, [x]) => n + x, 0) / p.length,
    p.reduce((n, [, z]) => n + z, 0) / p.length,
  ];
  const [wx, wz] = mid(walk.polygon);
  assert.equal(onSidewalk(wx, wz), true);
  // the street's own middle line is a road, not a sidewalk
  assert.equal(onSidewalk(0, 0), false);
  assert.equal(onSidewalk(100000, 100000), false);
  // the spawn is by the curb: a step onto the walk is the sidewalk
  assert.equal(onSidewalk(CITY_SPAWN.position[0], 9), true);
});
