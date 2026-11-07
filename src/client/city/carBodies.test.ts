// Every shipped car body loads through three's GLTFLoader, splits into its
// buckets and merges into one traffic geometry. A body with a stray attribute
// (a second vertex color layer from the source FBX) fails to merge in the
// browser, where the whole city's Suspense then never resolves, so the
// shipped files are checked here as the client reads them.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BODY_KEYS, bodyUrl } from "../../game/driving/bodies.ts";
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
