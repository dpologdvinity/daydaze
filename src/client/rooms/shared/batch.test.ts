import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { Batch } from "./batch.ts";

test("batch merges pieces into one mesh per material", () => {
  const gold = new THREE.MeshStandardMaterial();
  const lacquer = new THREE.MeshStandardMaterial();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
  const group = new Batch()
    .add(box, gold, { position: [1, 0, 0] })
    .add(box, gold, { position: [-1, 0, 0], rotation: [0, 1, 0] })
    .add(cyl, lacquer, { scale: 2 })
    .build();
  assert.equal(group.children.length, 2);
  const merged = group.children.find(
    (c) => (c as THREE.Mesh).material === gold,
  ) as THREE.Mesh;
  assert.equal(merged.geometry.attributes.position.count, 2 * 36);
});

test("batch leaves the shared source geometry untouched", () => {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const before = box.attributes.position.getX(0);
  new Batch()
    .add(box, new THREE.MeshBasicMaterial(), { position: [5, 0, 0] })
    .build();
  assert.equal(box.attributes.position.getX(0), before);
});
