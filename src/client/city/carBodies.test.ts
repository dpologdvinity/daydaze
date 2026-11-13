// Every shipped car body loads through three's GLTFLoader, splits into its
// buckets and merges into one traffic geometry. A body with a stray attribute
// (a second vertex color layer from the source FBX) fails to merge in the
// browser, where the whole city's Suspense then never resolves, so the
// shipped files are checked here as the client reads them.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BODY_KEYS, bodyUrl } from "../../game/driving/bodies.ts";
import { BODY_WHEELS } from "../../game/driving/wheels.ts";
import { WHEEL_TRIS } from "../../game/city/budget.ts";
import { bodyGeometry, mergedBody } from "./carBodies.ts";

async function load(url: string): Promise<GLTF> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const bytes = readFileSync(new URL(`../../../public${url}`, import.meta.url));
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return new Promise((resolve, reject) =>
    loader.parse(buffer, "", resolve, reject),
  );
}

test("every car body, near and low-detail, splits into buckets and merges", async () => {
  for (const key of BODY_KEYS)
    for (const lo of [false, true]) {
      const url = bodyUrl(key, lo);
      const parts = bodyGeometry((await load(url)).scene);
      assert.ok(parts.paint && parts.glass && parts.tyre, url);
      const merged = mergedBody(parts);
      const part = merged.getAttribute("aPart");
      // paint vertices are marked 1 and lamps 2, for the traffic shader
      assert.ok(part.array.includes(1), `${url} marks paint`);
      assert.ok(part.array.includes(2), `${url} marks lamps`);
      assert.equal(
        Object.keys(merged.attributes).sort().join(),
        "aPart,color,normal,position",
        url,
      );
    }
});

test("each body's GLB holds one wheel, centered, and the budget prices it", async () => {
  const tris = (g: { index: { count: number } | null } | undefined) =>
    (g?.index?.count ?? 0) / 3;
  for (const key of BODY_KEYS)
    for (const lo of [false, true]) {
      const url = bodyUrl(key, lo);
      const { tyre, rim } = bodyGeometry((await load(url)).scene);
      assert.ok(tyre, `${url} has a tyre`);
      assert.ok(lo ? !rim : true, `${url}: a distance twin has no hubs`);
      // the wheel sits on its own axle: x is the hub side, and it is round
      tyre.computeBoundingBox();
      const box = tyre.boundingBox;
      assert.ok(box, url);
      const center = box.getCenter(new THREE.Vector3());
      assert.ok(center.length() < 0.02, `${url} tyre at the origin`);
      const radius = BODY_WHEELS[key].radius;
      // a 10-sided disc is a little under its radius across one way
      assert.ok(
        Math.abs((box.max.y - box.min.y) / 2 - radius) < radius * 0.1,
        url,
      );
      assert.ok(box.max.x - box.min.x < radius * 2, `${url} axle along x`);
      const cost = tris(tyre) + tris(rim);
      assert.ok(
        cost <= (lo ? WHEEL_TRIS.lo : WHEEL_TRIS.near),
        `${url}: ${cost}`,
      );
      if (key === "sedan")
        assert.equal(cost, lo ? WHEEL_TRIS.lo : WHEEL_TRIS.near);
    }
});
