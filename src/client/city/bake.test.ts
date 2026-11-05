// Merging many copies of a small shape into one geometry, for kinds whose
// thousands of tiny instances each cost a whole draw in software WebGL.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bakeShapes } from "./bake.ts";

const shape = new THREE.PlaneGeometry(1, 1);
const place =
  (spots: readonly [number, number, number][]) =>
  (i: number, matrix: THREE.Matrix4, color: THREE.Color) => {
    const [x, y, z] = spots[i];
    matrix.makeTranslation(x, y, z);
    if (i === 1) color.setRGB(1, 0, 0);
  };

test("each copy lands where its matrix puts it, with its color and origin", () => {
  const spots: [number, number, number][] = [
    [0, 0, 0],
    [10, 2, -4],
  ];
  const g = bakeShapes(new THREE.BufferGeometry(), shape, 2, place(spots));
  const pos = g.getAttribute("position");
  const color = g.getAttribute("color");
  const origin = g.getAttribute("aOrigin");
  const nv = shape.getAttribute("position").count;
  // the second plane's first corner is the shape's, moved
  assert.equal(pos.getX(nv), shape.getAttribute("position").getX(0) + 10);
  assert.equal(pos.getY(nv), shape.getAttribute("position").getY(0) + 2);
  assert.deepEqual([color.getX(0), color.getY(0), color.getZ(0)], [1, 1, 1]);
  assert.deepEqual([color.getX(nv), color.getY(nv), color.getZ(nv)], [1, 0, 0]);
  assert.deepEqual(
    [origin.getX(nv), origin.getY(nv), origin.getZ(nv)],
    [10, 2, -4],
  );
  // the second plane's triangles point at its own vertices
  const index = g.getIndex();
  assert.ok(index);
  const per = shape.getIndex()?.count ?? 0;
  assert.equal(index.getX(per), (shape.getIndex()?.getX(0) ?? 0) + nv);
  assert.deepEqual(g.drawRange, { start: 0, count: 2 * per });
  assert.ok(g.boundingSphere);
  assert.ok(g.boundingSphere.containsPoint(new THREE.Vector3(10, 2, -4)));
});

test("a smaller bake reuses the buffers and draws only what it was given", () => {
  const spots: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
  ];
  const first = bakeShapes(new THREE.BufferGeometry(), shape, 3, place(spots));
  const again = bakeShapes(first, shape, 1, place(spots));
  assert.equal(again, first);
  assert.equal(again.drawRange.count, shape.getIndex()?.count);
  // and a bigger one than it can hold gets new buffers
  const more = Array.from({ length: 40 }, (_, i): [number, number, number] => [
    i,
    0,
    0,
  ]);
  const grown = bakeShapes(again, shape, 40, place(more));
  assert.notEqual(grown, again);
  assert.equal(grown.drawRange.count, 40 * (shape.getIndex()?.count ?? 0));
});

test("normals turn with the copy", () => {
  const g = bakeShapes(new THREE.BufferGeometry(), shape, 1, (_, matrix) =>
    matrix.makeRotationY(Math.PI / 2),
  );
  const n = g.getAttribute("normal");
  // the plane faces +z; a quarter turn about y faces it +x
  assert.ok(Math.abs(n.getX(0) - 1) < 1e-6);
  assert.ok(Math.abs(n.getZ(0)) < 1e-6);
});

test("an empty bake into a fresh geometry draws nothing", () => {
  const g = bakeShapes(new THREE.BufferGeometry(), shape, 0, () => undefined);
  assert.equal(g.drawRange.count, 0);
});
