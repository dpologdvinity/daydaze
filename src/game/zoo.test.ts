import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, isBlocked } from "./area.ts";
import { ROOMS } from "./rooms.ts";
import { HABITATS, loopAt, SPAWN } from "./zoo.ts";

const inside = (h: (typeof HABITATS)["savanna"], [x, z]: [number, number]) =>
  x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1;

test("animals walk loops that stay inside their habitat's fence", () => {
  for (const h of Object.values(HABITATS))
    for (let t = 0; t < 60; t += 0.7) {
      const { at, yaw } = loopAt(h, t, 1.2, 0.5);
      assert.ok(inside(h, [at[0], at[1]]));
      assert.ok(Number.isFinite(yaw));
    }
});

test("visitors walk the paths, not into the habitats", () => {
  const area = areaOf(ROOMS.zoo);
  assert.equal(isBlocked(area, SPAWN), false);
  for (const h of Object.values(HABITATS))
    assert.equal(isBlocked(area, [(h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2]), true);
});
