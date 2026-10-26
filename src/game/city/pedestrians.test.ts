import { test } from "node:test";
import assert from "node:assert/strict";
import { MENSWEAR, SHORT_CUTS, validateLook } from "../look.ts";
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
