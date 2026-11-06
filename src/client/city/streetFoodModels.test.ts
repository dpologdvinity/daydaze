// Shipped vendor models stay life-sized after meshopt decoding and instancing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { bakedGeometry } from "../world/bakedGeometry.ts";

for (const [name, min, max] of [
  ["truck", [4, 2.7, 2], [6.5, 3.6, 2.6]],
  ["cart", [1.4, 2, 1.3], [2, 2.6, 2]],
] as const) {
  test(`${name} fits street scale with its exported node transforms baked`, async () => {
    const bytes = readFileSync(
      new URL(`../../../public/models/vendors/${name}.glb`, import.meta.url),
    );
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      );
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    gltf.scene.traverse((mesh) => {
      if (!(mesh instanceof THREE.Mesh)) return;
      const geometry = bakedGeometry(mesh);
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox);
      bounds.union(geometry.boundingBox);
      geometry.dispose();
    });
    const size = bounds.getSize(new THREE.Vector3()).toArray();
    for (let i = 0; i < 3; i++)
      assert.ok(size[i] >= min[i] && size[i] <= max[i], `${name}: ${size}`);
    assert.ok(Math.abs(bounds.min.y) < 0.01, "wheels rest on the ground");
  });
}
