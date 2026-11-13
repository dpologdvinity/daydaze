import assert from "node:assert/strict";
import { test } from "node:test";
import { pointInPolygon } from "../walk.ts";
import { CHAT_GROUPS, nearestChatGroups } from "./chatGroups.ts";
import { CITY_SPAWN, CITY_SURFACES } from "./layout.ts";

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
