// The low tier's whole streamed city against the render budget: the plan
// with the bays the low tier really draws, plus the street trees, the
// furniture and the park's undergrowth, each costed from its shipped GLB.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CITY_SPAWN } from "./layout.ts";
import { HOUSE_MODELS, HOUSE_MODEL_TRIANGLES } from "./nyc.ts";
import { QUEUE_LOOKS, QUEUE_PERSON_TRIS } from "./queues.ts";
import {
  BAYS_CAMERA,
  baysWanted,
  liveCost,
  lowTierCost,
  MODEL_COST,
  modelsInBudget,
  SEASON_MODEL,
  trafficCost,
} from "./budget.ts";
import { BODY_KEYS, ROSTER_BODY } from "../driving/bodies.ts";
import type { Vec2 } from "../walk.ts";

type Gltf = {
  meshes: {
    primitives: { indices?: number; attributes: { POSITION: number } }[];
  }[];
  accessors: { count: number }[];
};
const isGltf = (v: unknown): v is Gltf =>
  typeof v === "object" &&
  v !== null &&
  "meshes" in v &&
  Array.isArray(v.meshes) &&
  "accessors" in v &&
  Array.isArray(v.accessors);

/** Triangles and primitives in a GLB, read from its JSON chunk. */
function glbCost(path: string): { tris: number; parts: number } {
  const bytes = readFileSync(
    new URL(`../../../public/models/${path}.glb`, import.meta.url),
  );
  const length = bytes.readUInt32LE(12);
  const gltf: unknown = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.ok(isGltf(gltf), path);
  let tris = 0;
  let parts = 0;
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives) {
      parts += 1;
      const n = gltf.accessors[p.indices ?? p.attributes.POSITION]?.count ?? 0;
      tris += n / 3;
    }
  return { tris: Math.round(tris), parts };
}

test("the budget's model costs match the shipped GLBs", () => {
  for (const path of modelsInBudget())
    assert.deepEqual(MODEL_COST[path], glbCost(path), path);
});

test("each house model's triangle count matches the shipped GLB", () => {
  HOUSE_MODELS.forEach((path, i) =>
    assert.equal(HOUSE_MODEL_TRIANGLES[i], glbCost(path).tris, path),
  );
});

test("the seasonal models' costs match the shipped GLBs", () => {
  for (const [path, cost] of Object.entries(SEASON_MODEL))
    assert.deepEqual(cost, glbCost(path), path);
});

test("the queue people are one part each and no dearer than the budget says", () => {
  for (const look of QUEUE_LOOKS) {
    const cost = glbCost(`speedway/people-${look}-idle`);
    assert.equal(cost.parts, 1, look);
    assert.ok(cost.tris <= QUEUE_PERSON_TRIS, `${look}: ${cost.tris}`);
  }
});

test("wherever she stands, the low tier's city (bays, trees, furniture, park) fits 250 draw calls and 300k triangles", () => {
  let worst = { tris: 0, at: [0, 0] as Vec2 };
  for (let x = -432; x <= 432; x += 32)
    for (let z = -320; z <= 368; z += 32) {
      const at: Vec2 = [x, z];
      const cost = lowTierCost(at);
      assert.ok(cost.drawCalls <= 250, `${cost.drawCalls} draw calls at ${at}`);
      if (cost.triangles > worst.tris) worst = { tris: cost.triangles, at };
    }
  // the park, where the undergrowth is thickest
  const park = lowTierCost([228, -292]);
  assert.ok(
    park.triangles < 300_000,
    `${park.triangles} triangles in the park`,
  );
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
});

test("pulled out to the overview, the low tier draws the infill and yards out to the whole view and still fits", () => {
  let worst = { tris: 0, at: [0, 0] as Vec2 };
  for (let x = -432; x <= 432; x += 48)
    for (let z = -320; z <= 368; z += 48) {
      const at: Vec2 = [x, z];
      const cost = lowTierCost(at, false);
      assert.ok(cost.drawCalls <= 250, `${cost.drawCalls} draw calls at ${at}`);
      if (cost.triangles > worst.tris) worst = { tris: cost.triangles, at };
    }
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
  // and the infill really shows out there: more of it than the near view has
  const at = CITY_SPAWN.position;
  assert.ok(
    lowTierCost(at, false).planTriangles > 0 &&
      lowTierCost(at, false).bays === 0,
  );
});

test("the low tier's cost counts the bays it draws", () => {
  const at = CITY_SPAWN.position;
  const cost = lowTierCost(at);
  assert.ok(cost.bays > 0, "the spawn is near New York blocks");
  assert.ok(cost.triangles > cost.planTriangles);
});

test("the bays come in as the camera nears her and go as it pulls out to the overview, without flicker between", () => {
  // the overview (about 255 m out) and a street view
  assert.equal(baysWanted(255, true), false);
  assert.equal(baysWanted(30, false), true);
  // between the two edges it keeps what it had
  const mid = (BAYS_CAMERA.on + BAYS_CAMERA.off) / 2;
  assert.equal(baysWanted(mid, true), true);
  assert.equal(baysWanted(mid, false), false);
  assert.ok(BAYS_CAMERA.on < BAYS_CAMERA.off);
});

test("street-food downloads and nearby vendor costumes are included in the budget", () => {
  for (const model of [
    "vendors/truck",
    "vendors/cart",
    "doll/body",
    "doll/hair-bob",
    "doll/outfit-jeans",
    "doll/shoes-platforms",
  ]) {
    assert.ok(modelsInBudget().includes(model), model);
    assert.deepEqual(MODEL_COST[model], glbCost(model), model);
  }
  for (const at of [
    [254, -270],
    [246, -267.4],
    [262, -267.4],
    [-18, 15.6],
    [20, 15.6],
  ] satisfies Vec2[]) {
    const cost = lowTierCost(at);
    assert.ok(cost.triangles < 300_000, `${cost.triangles} at ${at}`);
    assert.ok(cost.drawCalls < 250);
  }
});

test("the park's zoomed-out view prices its walkers, wildlife and dogs, and still fits with headroom", () => {
  // the street-food stop, where the camera pulled out sees the whole lawn
  const at: Vec2 = [254, -264];
  const priced: string[] = [];
  const live = liveCost(at, (model) => priced.push(model));
  assert.ok(live.triangles > 0, "walkers and the crowd are priced");
  for (const kind of ["deer", "rabbit", "fox", "labrador", "husky", "shibainu"])
    assert.ok(priced.includes(`animals/${kind}`), `${kind} is priced`);
  // the band shell stands 24 m away: its stage, chairs, instruments and band
  for (const model of ["park/band-shell", "park/lawn-chair", "park/band-stand"])
    assert.ok(priced.includes(model), `${model} is priced`);
  const cost = lowTierCost(at);
  assert.ok(
    cost.triangles >= cost.planTriangles + live.triangles,
    "the total includes the live people and animals",
  );
  assert.ok(cost.triangles < 295_000, `${cost.triangles} triangles`);
  assert.ok(cost.drawCalls < 250, `${cost.drawCalls} draw calls`);
});

test("the plan's densest street keeps headroom under the budget", () => {
  const cost = lowTierCost([-144, 0]);
  assert.ok(cost.triangles < 295_000, `${cost.triangles} triangles`);
});

test("traffic is priced from the shipped car bodies, more on a road than on a lawn", () => {
  // every body (near for the player's car, -lo for traffic) is in the budget
  for (const key of BODY_KEYS)
    for (const path of [`cars/${key}`, `cars/${key}-lo`])
      assert.ok(modelsInBudget().includes(path), path);
  // a distance twin is under 1,500 triangles, a near model under 6,000
  for (const key of BODY_KEYS) {
    assert.ok(MODEL_COST[`cars/${key}-lo`]!.tris <= 1500, key);
    assert.ok(MODEL_COST[`cars/${key}`]!.tris <= 6000, key);
  }
  const lawn: Vec2 = [254, -264];
  const crossing: Vec2 = [-144, 0];
  const onLawn = trafficCost(lawn);
  const onRoad = trafficCost(crossing);
  assert.ok(onRoad.triangles > onLawn.triangles);
  // at the wheel: the dearest road car's near model is in the road price
  const dearestOwn = Math.max(
    ...Object.values(ROSTER_BODY).map((k) => MODEL_COST[`cars/${k}`]!.tris),
  );
  assert.ok(onRoad.triangles >= dearestOwn);
  assert.ok(onLawn.triangles < dearestOwn);
});

test("the park gate, the dearest low-tier view, stays at or under 270k triangles", () => {
  const gate = lowTierCost([254, -270]);
  assert.ok(gate.triangles <= 270_000, `${gate.triangles} triangles`);
  assert.ok(gate.drawCalls <= 235, `${gate.drawCalls} draw calls`);
});
