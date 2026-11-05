import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, isBlocked } from "./area.ts";
import { ROOMS } from "./rooms.ts";
import { fenceSpots, HABITATS, loopAt, SPAWN } from "./zoo.ts";

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

test("fence panels line every side of every habitat end to end", () => {
  const spots = fenceSpots();
  let perimeter = 0;
  for (const h of Object.values(HABITATS))
    perimeter += 2 * (h.x1 - h.x0) + 2 * (h.z1 - h.z0);
  // each panel's x scale is its length in meters, so they add up to the fence
  const total = spots.reduce((sum, s) => sum + s.sx, 0);
  assert.ok(Math.abs(total - perimeter) < 1e-6);
  for (const s of spots) {
    assert.ok(s.sx > 1.5 && s.sx < 3.2);
    assert.ok(Number.isFinite(s.yaw));
  }
});

test("the farm's cow and donkey have a voice inside the farm", async () => {
  const { farmVoicesAt, HABITATS } = await import("./zoo.ts");
  const voices = farmVoicesAt(12);
  assert.deepEqual(voices.map((v) => v.kind).sort(), ["cow", "donkey"]);
  const f = HABITATS.farm;
  for (const v of voices) {
    assert.ok(v.at[0] >= f.x0 && v.at[0] <= f.x1);
    assert.ok(v.at[1] >= f.z0 && v.at[1] <= f.z1);
  }
});

test("every photo-hunt species has an animal in the zoo, and every walker a model", async () => {
  const { existsSync } = await import("node:fs");
  const { SPECIES } = await import("./safari.ts");
  const { animalsAt, WALKERS } = await import("./zoo.ts");
  const here = new Set(animalsAt(0).map((a) => a.kind));
  for (const s of SPECIES) assert.ok(here.has(s.id), `${s.id} is nowhere`);
  for (const w of WALKERS)
    assert.ok(existsSync(`public/models/animals/${w.kind}.glb`), w.kind);
});

test("every adoptable pet has a model", async () => {
  const { existsSync } = await import("node:fs");
  const { PET_KINDS } = await import("./pet.ts");
  for (const k of PET_KINDS)
    assert.ok(existsSync(`public/models/animals/${k}.glb`), k);
});
