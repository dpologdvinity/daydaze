import assert from "node:assert/strict";
import { test } from "node:test";
import { pointInPolygon } from "../walk.ts";
import { isBlocked } from "../area.ts";
import { FURNITURE, PARKED_CARS } from "./dressing.ts";
import { YARD_TREES } from "./yards.ts";
import { elBoxes } from "./el.ts";
import { CHAT_RING } from "../chatSpots.ts";
import {
  CHAT_GROUPS,
  huddleFits,
  huddleReach,
  nearestChatGroups,
} from "./chatGroups.ts";
import {
  CITY_AREA,
  CITY_SPAWN,
  CITY_SURFACES,
  PROPS,
  ROAD_NODES,
} from "./layout.ts";

const onSidewalk = (p: readonly [number, number]) =>
  CITY_SURFACES.some(
    (s) => s.kind === "sidewalk" && pointInPolygon(s.polygon, [p[0], p[1]]),
  );

test("the city has a dozen or more groups, of two to four, each on a sidewalk", () => {
  assert.ok(CHAT_GROUPS.length >= 12, `${CHAT_GROUPS.length}`);
  for (const g of CHAT_GROUPS) {
    assert.ok(g.looks.length >= 2 && g.looks.length <= 4);
    assert.ok(g.looks.every((l) => l && typeof l.skin === "string"));
    assert.ok(onSidewalk(g.at), `${g.at}`);
    assert.ok(g.seed > 0 && g.night >= 0 && g.night <= 1);
  }
  assert.equal(
    new Set(CHAT_GROUPS.map((g) => g.seed)).size,
    CHAT_GROUPS.length,
  );
});

test("no two groups stand within ten meters of each other", () => {
  for (const [i, a] of CHAT_GROUPS.entries())
    for (const b of CHAT_GROUPS.slice(i + 1))
      assert.ok(
        Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 10,
        `${a.at} ${b.at}`,
      );
});

test("a newcomer at the city's spawn has a group in sight", () => {
  const near = nearestChatGroups(CITY_SPAWN.position, 30, 4);
  assert.ok(near.length >= 1);
});

test("the nearest groups come first and never add up to more than the dolls allowed", () => {
  const at: [number, number] = [22, 10];
  const picked = nearestChatGroups(at, 200, 5);
  const people = picked.reduce(
    (n, i) => n + (CHAT_GROUPS[i]?.looks.length ?? 0),
    0,
  );
  assert.ok(people <= 5 && picked.length >= 1);
  const d = (i: number) =>
    Math.hypot(
      (CHAT_GROUPS[i]?.at[0] ?? 0) - at[0],
      (CHAT_GROUPS[i]?.at[1] ?? 0) - at[1],
    );
  for (let k = 1; k < picked.length; k++)
    assert.ok(d(picked[k - 1] as number) <= d(picked[k] as number));
  assert.deepEqual(nearestChatGroups(at, 200, 1).length <= 1, true);
  // a group that is not out is not offered
  assert.deepEqual(
    nearestChatGroups(at, 200, 5, () => false),
    [],
  );
});

test("every huddle's people and their gesturing arms are clear of the street's furniture, props, trees and walls", () => {
  const things = [
    ...FURNITURE.map((f) => [f.x, f.z, f.kind] as const),
    ...PROPS.map((p) => [p.position[0], p.position[1], p.kind] as const),
    ...YARD_TREES.map(([x, z]) => [x, z, "tree"] as const),
    ...PARKED_CARS.map((c) => [c.x, c.z, "parked car"] as const),
  ];
  for (const g of CHAT_GROUPS) {
    const size = g.looks.length as 2 | 3 | 4;
    const r = CHAT_RING[size];
    // each person's spot, and an arm's length (0.9 m) round it
    for (let m = 0; m < size; m++) {
      const a = g.turn + (m / size) * Math.PI * 2;
      const p = [g.at[0] + Math.sin(a) * r, g.at[1] + Math.cos(a) * r];
      for (const reach of [0, 0.9]) {
        for (let k = 0; k < (reach ? 8 : 1); k++) {
          const b = (k / 8) * Math.PI * 2;
          const q: [number, number] = [
            p[0] + Math.sin(b) * reach,
            p[1] + Math.cos(b) * reach,
          ];
          assert.equal(isBlocked(CITY_AREA, q), false, `${g.at} wall at ${q}`);
        }
      }
      for (const [x, z, kind] of things)
        assert.ok(
          Math.hypot(x - p[0], z - p[1]) > 0.9 + 0.25,
          `${g.at}: a ${kind} at ${x},${z} is within reach of person ${m}`,
        );
    }
    assert.ok(huddleFits(g.at, size), `${g.at}`);
  }
});

test("a huddle does not fit beside a lamp or inside a wall, and reaches farther for more people", () => {
  assert.equal(huddleFits([0, 0], 2, [[0.5, 0.5]]), false);
  assert.equal(huddleFits([0, 0], 2, [[5, 5]]), huddleFits([0, 0], 2, []));
  assert.ok(huddleReach(4) > huddleReach(2));
  // out in the sea, with nothing round, blockers don't matter; on a building they do
  const wall = CITY_AREA.blockers[0]?.[0];
  assert.ok(wall);
  assert.equal(huddleFits([wall[0], wall[1]], 2, []), false);
});

test("no huddle stands in the El's stairs, platform or columns, or within an arm of them", () => {
  const gaps = [
    ...new Set(
      ROAD_NODES.filter((n) => Math.abs(n.position[1]) === 192).map(
        (n) => n.position[0],
      ),
    ),
  ];
  const low = elBoxes(gaps).filter((b) => b.y - b.sy / 2 < 3);
  assert.ok(low.length > 20);
  for (const g of CHAT_GROUPS)
    for (const b of low) {
      const dx = Math.max(Math.abs(g.at[0] - b.x) - b.sx / 2, 0);
      const dz = Math.max(Math.abs(g.at[1] - b.z) - b.sz / 2, 0);
      assert.ok(
        Math.hypot(dx, dz) > huddleReach(g.looks.length as 2 | 3 | 4),
        `${g.at} is by an El ${b.kind} at ${b.x},${b.z}`,
      );
    }
});
