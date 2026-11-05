import { test } from "node:test";
import assert from "node:assert/strict";
import { naturalPace } from "../dance/clips.ts";
import { walkRate } from "../dance/stride.ts";
import { gaitOf } from "../gaits.ts";
import { MENSWEAR, SHORT_CUTS, modelSuffix, validateLook } from "../look.ts";
import { CITY_AREA, CITY_SPAWN } from "./layout.ts";
import {
  PEDESTRIANS,
  nearestPedestrians,
  pedestrianAt,
} from "./pedestrians.ts";

test("the city has people on its sidewalks, each a valid look", () => {
  assert.ok(PEDESTRIANS.length > 40, `${PEDESTRIANS.length} pedestrians`);
  for (const p of PEDESTRIANS) assert.equal(validateLook(p.look), true);
});

test("pedestrians stay on walkable ground and keep walking back and forth", () => {
  for (const [i, p] of PEDESTRIANS.entries()) {
    if (i % 5) continue;
    for (let t = 0; t < 120; t += 7.3) {
      const pose = pedestrianAt(p, t);
      for (const v of [pose.x, pose.z, pose.yaw]) assert.ok(Number.isFinite(v));
      // on a surface: clamping leaves her where she is
      assert.equal(
        CITY_AREA.surfaces.some(
          (s) =>
            pose.x >= Math.min(...s.map(([x]) => x)) - 0.01 &&
            pose.x <= Math.max(...s.map(([x]) => x)) + 0.01 &&
            pose.z >= Math.min(...s.map(([, z]) => z)) - 0.01 &&
            pose.z <= Math.max(...s.map(([, z]) => z)) + 0.01,
        ),
        true,
        `pedestrian ${i} at ${pose.x},${pose.z}`,
      );
    }
  }
  // a turn at each end: the same time a lap later is the same spot
  const p = PEDESTRIANS[0];
  const lap = (2 * Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1])) / p.speed;
  const a = pedestrianAt(p, 10);
  const b = pedestrianAt(p, 10 + lap);
  assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6);
});

test("only the nearest few are drawn, nearest first", () => {
  const near = nearestPedestrians(CITY_SPAWN.position, 30, 4, 60);
  assert.ok(near.length <= 4);
  const d = near.map((i) => {
    const pose = pedestrianAt(PEDESTRIANS[i], 30);
    return Math.hypot(
      pose.x - CITY_SPAWN.position[0],
      pose.z - CITY_SPAWN.position[1],
    );
  });
  for (let k = 1; k < d.length; k++) assert.ok(d[k] >= d[k - 1]);
  assert.ok(d.every((v) => v <= 60));
});

test("men walk the city too, in menswear with short cuts", () => {
  const men = PEDESTRIANS.filter((p) => p.look.body === "masculine");
  const share = men.length / PEDESTRIANS.length;
  assert.ok(share > 0.3 && share < 0.55, `${men.length}/${PEDESTRIANS.length}`);
  for (const m of men) {
    assert.ok(MENSWEAR.includes(m.look.outfit), m.look.outfit);
    assert.ok(SHORT_CUTS.includes(m.look.hairStyle), m.look.hairStyle);
    assert.ok(validateLook(m.look));
  }
});

test("every pedestrian walks at her gait clip's own pace, so it plays near 1x", () => {
  for (const p of PEDESTRIANS) {
    const man = modelSuffix(p.look) === "-m";
    const pace = naturalPace(gaitOf(p.look.gait).clip, man);
    assert.ok(pace, `${p.look.gait} has a measured pace`);
    const rate = walkRate(p.speed, pace);
    assert.ok(rate > 0.94 && rate < 1.06, `rate ${rate}`);
  }
});

test("boardwalk strollers keep to the open deck, never through a shop, cart or the carousel", async () => {
  const { isBlocked } = await import("../area.ts");
  const { CITY_AREA } = await import("./layout.ts");
  const { SHOP_Z1 } = await import("./boardwalk.ts");
  const deck = PEDESTRIANS.filter((p) => p.a[1] > SHOP_Z1 && p.a[1] < 292);
  assert.ok(deck.length > 5, "strollers on the deck");
  for (const p of deck)
    for (let t = 0; t <= 1; t += 0.02) {
      const at: [number, number] = [
        p.a[0] + (p.b[0] - p.a[0]) * t,
        p.a[1] + (p.b[1] - p.a[1]) * t,
      ];
      assert.equal(isBlocked(CITY_AREA, at), false, `${at}`);
    }
  // nobody is pinned on a storefront wall
  for (const p of PEDESTRIANS)
    assert.ok(
      Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) >= 20,
      `a strip of ${p.a} to ${p.b} is too short to pace`,
    );
});

test("a few joggers run the park's paths and the boardwalk's deck, none with a dog", () => {
  const joggers = PEDESTRIANS.filter((p) => p.look.gait === "jog");
  assert.ok(joggers.length >= 3, `${joggers.length} joggers`);
  assert.ok(joggers.length < PEDESTRIANS.length / 3);
  assert.ok(
    joggers.some((p) => p.a[1] > 276 && p.a[1] < 292),
    "on the deck",
  );
  assert.ok(joggers.every((p) => !p.dog));
});

test("the deck is a crowd by day, spread along it, and thins out at night", async () => {
  const { pedestrianOut } = await import("./pedestrians.ts");
  const deck = PEDESTRIANS.filter((p) => p.a[1] > 276 && p.a[1] < 292);
  assert.ok(deck.length >= 60, `${deck.length} on the deck`);
  // by day a few hundred meters of deck hold a dozen of them
  const near = deck.filter((p) => {
    const x = pedestrianAt(p, 500).x;
    return x > 0 && x < 150;
  });
  assert.ok(near.length >= 6, `${near.length} within 150 m`);
  assert.ok(deck.every((p) => pedestrianOut(p, 14)));
  const late = deck.filter((p) => pedestrianOut(p, 2)).length;
  assert.ok(late > 0 && late < deck.length / 2, `${late} out at 2 am`);
});
