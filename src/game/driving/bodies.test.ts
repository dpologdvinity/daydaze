// The downloaded car bodies: every roster road car has one, the shipped GLBs
// are within their triangle targets and carry the named buckets the client
// paints, and traffic picks bodies deterministically.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createTraffic } from "../city/traffic.ts";
import {
  BODY_BUCKETS,
  BODY_KEYS,
  BODY_LENGTH,
  FIXED_PAINT,
  HEAVY_MIX,
  TRAFFIC_MIX,
  bodyOfCar,
  bodyUrl,
  pickBody,
} from "./bodies.ts";
import { CARS, ROAD_CARS } from "./roster.ts";

type Gltf = {
  meshes: {
    name?: string;
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

/** The JSON chunk of a shipped body GLB. */
function readBody(key: (typeof BODY_KEYS)[number], lo: boolean): Gltf {
  const bytes = readFileSync(
    new URL(`../../../public${bodyUrl(key, lo)}`, import.meta.url),
  );
  const length = bytes.readUInt32LE(12);
  const json: unknown = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.ok(isGltf(json), key);
  return json;
}

function triangles(gltf: Gltf): number {
  let n = 0;
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives)
      n += (gltf.accessors[p.indices ?? p.attributes.POSITION]?.count ?? 0) / 3;
  return Math.round(n);
}

test("every road car in the roster wears a body, and nothing else does", () => {
  for (const car of ROAD_CARS)
    assert.ok(bodyOfCar(car.id), `${car.id} has no body`);
  for (const car of CARS.filter((c) => !ROAD_CARS.includes(c)))
    assert.equal(bodyOfCar(car.id), null, `${car.id} is not a road car`);
  // an id from an old or unknown save never throws
  assert.equal(bodyOfCar("no-such-car"), null);
});

test("each body ships near and distance models within their triangle targets", () => {
  for (const key of BODY_KEYS) {
    const near = readBody(key, false);
    const lo = readBody(key, true);
    assert.ok(triangles(near) <= 6000, `${key}: ${triangles(near)} near`);
    assert.ok(triangles(lo) <= 1500, `${key}: ${triangles(lo)} lo`);
    assert.ok(triangles(lo) < triangles(near), key);
    for (const gltf of [near, lo]) {
      const names = gltf.meshes.map((m) => m.name ?? "");
      assert.ok(names.includes("paint"), `${key} has paint`);
      for (const name of names)
        assert.ok(
          BODY_BUCKETS.some((b) => b === name),
          `${key}: unknown mesh ${name}`,
        );
    }
    assert.ok(BODY_LENGTH[key] > 3);
  }
});

test("pickBody follows the weights and stays in the list", () => {
  assert.equal(pickBody(TRAFFIC_MIX, 0), "sedan");
  assert.equal(pickBody(TRAFFIC_MIX, 0.999999), "cop");
  assert.equal(pickBody(HEAVY_MIX, 0.2), "ambulance");
  assert.equal(pickBody(HEAVY_MIX, 0.8), "schoolbus");
  // out-of-range input is clamped, never undefined
  assert.equal(pickBody(TRAFFIC_MIX, -1), "sedan");
  assert.equal(pickBody(TRAFFIC_MIX, 7), "cop");
});

test("traffic vehicles wear bodies of the right kind, jeepneys none", () => {
  const t = createTraffic(60, 11);
  const bodies = new Set<string>();
  for (const car of t.cars) {
    if (car.kind === "jeepney") assert.equal(car.body, null);
    else {
      assert.ok(car.body, `${car.kind} ${car.id} has a body`);
      bodies.add(car.body);
      const heavy = car.body === "ambulance" || car.body === "schoolbus";
      assert.equal(car.kind === "heavy", heavy, `${car.id}: ${car.body}`);
    }
  }
  // a mix, not one model
  assert.ok(bodies.size >= 5, [...bodies].join());
  // vehicles that are what they are keep their paint
  for (const key of Object.keys(FIXED_PAINT))
    assert.ok(BODY_KEYS.some((k) => k === key));
});
