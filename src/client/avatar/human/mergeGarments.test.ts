// Far garment twins merge into one skinned mesh that skins every vertex where
// its own piece put it, morphs included, even when each file stores its
// vertices in its own quantized frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { ATLAS, atlasCols, atlasRect, mergeGarments } from "./mergeGarments.ts";

/** Two bones: a root and a child one meter up, posed (bent) a little. */
function rig() {
  const root = new THREE.Bone();
  const arm = new THREE.Bone();
  arm.position.set(0, 1, 0);
  root.add(arm);
  root.updateMatrixWorld(true);
  const inverses = [root, arm].map((b) => b.matrixWorld.clone().invert());
  return { root, arm, inverses };
}

/** A triangle skinned to `bones`, stored in a frame `frame` (positions
 * pre-transformed by its inverse, inverse binds by it), with one morph. */
function piece(
  bones: THREE.Bone[],
  inverses: THREE.Matrix4[],
  frame: THREE.Matrix4,
  morph: string,
) {
  const g = new THREE.BufferGeometry();
  const back = frame.clone().invert();
  const pts = [0, 0.5, 0, 0.2, 1.2, 0, -0.2, 1.4, 0.1].map((x) => x);
  const p = new Float32Array(pts);
  const v = new THREE.Vector3();
  for (let i = 0; i < 3; i++)
    v.fromArray(p, i * 3)
      .applyMatrix4(back)
      .toArray(p, i * 3);
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute(
    "normal",
    new THREE.BufferAttribute(
      new Float32Array(9).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)),
      3,
    ),
  );
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(
      [0.5, 0.5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      4,
    ),
  );
  g.setIndex([0, 1, 2]);
  const delta = new THREE.BufferAttribute(
    new Float32Array([0, 0, 0.1, 0, 0, 0.1, 0, 0, 0.1]),
    3,
  );
  delta.name = morph;
  g.morphAttributes.position = [delta];
  // and a normal delta, tipping the normal from +z to +y at full influence
  const bend = new THREE.BufferAttribute(
    new Float32Array([0, 1, -1, 0, 1, -1, 0, 1, -1]),
    3,
  );
  bend.name = morph;
  g.morphAttributes.normal = [bend];
  g.morphTargetsRelative = true;
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial());
  mesh.updateMorphTargets();
  mesh.bind(
    new THREE.Skeleton(
      bones,
      inverses.map((m) => m.clone().multiply(frame)),
    ),
    new THREE.Matrix4(),
  );
  return mesh;
}

/** Where a mesh's vertex lands after skinning (morphs at `w`). */
function skinned(mesh: THREE.SkinnedMesh, i: number, morph: string, w: number) {
  const v = new THREE.Vector3().fromBufferAttribute(
    mesh.geometry.getAttribute("position"),
    i,
  );
  const k = mesh.morphTargetDictionary?.[morph];
  const d =
    k === undefined ? undefined : mesh.geometry.morphAttributes.position?.[k];
  if (d) v.add(new THREE.Vector3().fromBufferAttribute(d, i).multiplyScalar(w));
  mesh.updateMatrixWorld(true);
  return mesh.applyBoneTransform(i, v);
}

test("merged garments skin, morph and tint like the pieces they came from", () => {
  const { root, arm, inverses } = rig();
  const quantized = new THREE.Matrix4().compose(
    new THREE.Vector3(0.3, -0.2, 0.1),
    new THREE.Quaternion(),
    new THREE.Vector3(2, 2, 2),
  );
  const top = piece([root, arm], inverses, new THREE.Matrix4(), "plus");
  const bottom = piece(
    [arm, root],
    [inverses[1] ?? new THREE.Matrix4(), inverses[0] ?? new THREE.Matrix4()],
    quantized,
    "tuck",
  );
  // the second piece lists its joints the other way round
  const idx = bottom.geometry.getAttribute("skinIndex");
  for (let i = 0; i < idx.count; i++)
    for (let c = 0; c < 2; c++)
      idx.setComponent(i, c, 1 - idx.getComponent(i, c));
  arm.rotation.z = 0.4;
  root.updateMatrixWorld(true);
  const merged = mergeGarments([
    { mesh: top, color: "#ff0000" },
    { mesh: bottom, color: "#0000ff" },
  ]);
  assert.ok(merged);
  // a scaled frame keeps the normal and its delta at the same scale, so the
  // blended normal still turns all the way to +y
  const n = merged.geometry.getAttribute("normal");
  const k = merged.morphTargetDictionary?.tuck ?? -1;
  const d = merged.geometry.morphAttributes.normal?.[k];
  assert.ok(d);
  const blended = new THREE.Vector3()
    .fromBufferAttribute(n, 3)
    .add(new THREE.Vector3().fromBufferAttribute(d, 3))
    .normalize();
  assert.ok(
    blended.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-4,
    `${blended.toArray()}`,
  );
  assert.deepEqual(Object.keys(merged.morphTargetDictionary ?? {}).sort(), [
    "plus",
    "tuck",
  ]);
  for (const [mesh, offset, morph] of [
    [top, 0, "plus"],
    [bottom, 3, "tuck"],
  ] as const)
    for (let i = 0; i < 3; i++) {
      const want = skinned(mesh, i, morph, 1);
      const got = skinned(merged, offset + i, morph, 1);
      assert.ok(
        got.distanceTo(want) < 1e-4,
        `${morph} ${i}: ${got.toArray()} vs ${want.toArray()}`,
      );
    }
  const color = merged.geometry.getAttribute("color");
  assert.equal(color.getX(0), 1);
  assert.equal(color.getZ(3), 1);
  // with atlas rects, each piece's UVs land inside its own cell, and a
  // piece with no UVs points at its cell's corner
  top.geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1.5], 2),
  );
  const inAtlas = mergeGarments([
    { mesh: top, color: "#ff0000", rect: [0.5, 0, 0.5, 0.5] },
    { mesh: bottom, color: "#0000ff", rect: [0, 0.5, 0, 0] },
  ]);
  const uv = inAtlas?.geometry.getAttribute("uv");
  assert.ok(uv);
  assert.deepEqual([uv.getX(1), uv.getY(1)], [1, 0]);
  // a UV past the map's edge is clamped into the cell
  assert.deepEqual([uv.getX(2), uv.getY(2)], [1, 0.5]);
  assert.deepEqual([uv.getX(4), uv.getY(4)], [0, 0.5]);
  // without rects there are no UVs at all
  assert.equal(merged.geometry.getAttribute("uv"), undefined);
});

test("pieces that disagree on a shared joint's frame are not merged", () => {
  const { root, arm, inverses } = rig();
  const a = piece([root, arm], inverses, new THREE.Matrix4(), "plus");
  const b = piece([root, arm], inverses, new THREE.Matrix4(), "plus");
  // one joint bound elsewhere: no single frame change fits both
  b.skeleton.boneInverses[1]?.multiply(
    new THREE.Matrix4().makeTranslation(0, 0.5, 0),
  );
  assert.equal(
    mergeGarments([
      { mesh: a, color: "#fff" },
      { mesh: b, color: "#fff" },
    ]),
    null,
  );
  assert.equal(mergeGarments([]), null);
});

test("atlas cells tile the texture without overlap, the white cell last", () => {
  assert.equal(atlasCols(1), 2);
  assert.equal(atlasCols(3), 2);
  assert.equal(atlasCols(4), 3);
  const cells = [0, 1, 2].map((i) => atlasRect(i, 3));
  for (const [x, y, w, h] of cells) {
    assert.ok(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1);
    assert.ok(w >= 0.5 - 4 / ATLAS && w < 0.5);
    assert.equal(w, h);
  }
  // distinct cells, each inside its own quarter
  assert.deepEqual(
    cells.map(([x, y]) => [Math.floor(x * 2), Math.floor(y * 2)]),
    [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  );
  // the white cell is a single spot in the middle of the last quarter
  assert.deepEqual(atlasRect(3, 3), [0.75, 0.75, 0, 0]);
});

test("the merged far geometry carries only the tuck for the shoe worn", () => {
  const { root, arm, inverses } = rig();
  const pieces = ["plus", "in_ankle-boots", "in_flip-flops"].map((name) => ({
    mesh: piece([root, arm], inverses, new THREE.Matrix4(), name),
    color: "#ffffff",
  }));
  const merged = mergeGarments(pieces, "in_ankle-boots");
  assert.ok(merged);
  assert.deepEqual(Object.keys(merged.morphTargetDictionary ?? {}), [
    "plus",
    "in_ankle-boots",
  ]);
});
