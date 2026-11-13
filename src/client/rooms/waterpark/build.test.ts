// Tests for Props.addPainted: a model's own vertex colors survive the merge
// next to tinted parts, and a model without colors is refused.

import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { Props } from "./build.ts";

/** A one-triangle model painted `rgb`. */
function painted(rgb: [number, number, number]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
  );
  g.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3),
  );
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array([...rgb, ...rgb, ...rgb]), 3),
  );
  return g;
}

test("addPainted keeps the model's colors and merges with tinted parts", () => {
  const root = new Props();
  root.add(new THREE.BoxGeometry(1, 1, 1), "#ffffff");
  root.within(2, 0, 0).addPainted(painted([1, 0, 0]), [0, 1, 0]);
  const merged = root.geometry();
  const colors = merged.getAttribute("color");
  const at = merged.getAttribute("position");
  const last = colors.count - 1;
  assert.deepEqual(
    [colors.getX(last), colors.getY(last), colors.getZ(last)],
    [1, 0, 0],
  );
  // posed: the frame's x = 2 plus the part's y = 1
  assert.equal(at.getX(last - 2), 2);
  assert.equal(at.getY(last - 2), 1);
});

test("addPainted refuses a model with no vertex colors", () => {
  const g = painted([1, 1, 1]);
  g.deleteAttribute("color");
  assert.throws(() => new Props().addPainted(g), /no vertex colors/);
});
