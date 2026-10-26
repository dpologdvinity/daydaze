import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FACE_HEIGHT,
  CHEST_HEIGHT,
  MIN_ZOOM,
  focusHeight,
  zoomAbout,
  type Vec3,
} from "./cameraZoom.ts";

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("far away the camera zooms toward her chest, close up toward her face", () => {
  assert.equal(focusHeight(40), CHEST_HEIGHT);
  assert.equal(focusHeight(MIN_ZOOM), FACE_HEIGHT);
  const mid = focusHeight(2);
  assert.ok(mid > CHEST_HEIGHT && mid < FACE_HEIGHT);
});

test("zooming in from a far overview ends close on her, not on the overview's point", () => {
  // the city's room shot: high above, looking at a point 255 m from her
  let camera: Vec3 = [-120, 150, 170];
  let target: Vec3 = [0, 0, 0];
  const her: Vec3 = [30, 0, -40];
  for (let i = 0; i < 80; i++) {
    const focus: Vec3 = [her[0], focusHeight(dist(camera, her)), her[2]];
    ({ camera, target } = zoomAbout(
      camera,
      target,
      focus,
      0.85,
      MIN_ZOOM,
      300,
    ));
  }
  const face: Vec3 = [her[0], FACE_HEIGHT, her[2]];
  assert.ok(
    dist(camera, face) < 0.7,
    `camera ${dist(camera, face)} m from her face`,
  );
  assert.ok(
    dist(target, face) < 0.7,
    `target ${dist(target, face)} m from her face`,
  );
});

test("zoom stops at the nearest and farthest distance", () => {
  const focus: Vec3 = [0, 1, 0];
  const near = zoomAbout([0, 1, 1], [0, 1, 0], focus, 0.1, MIN_ZOOM, 18);
  assert.equal(Math.round(dist(near.camera, focus) * 1000) / 1000, MIN_ZOOM);
  const far = zoomAbout([0, 1, 10], [0, 1, 0], focus, 4, MIN_ZOOM, 18);
  assert.equal(Math.round(dist(far.camera, focus) * 1000) / 1000, 18);
});

test("zooming keeps the camera's direction to her", () => {
  const focus: Vec3 = [0, 1, 0];
  const { camera } = zoomAbout([3, 5, 4], [0, 1, 0], focus, 0.5, MIN_ZOOM, 18);
  const before = [3, 4, 4].map((v) => v / Math.hypot(3, 4, 4));
  const after = [camera[0], camera[1] - 1, camera[2]];
  const len = Math.hypot(after[0]!, after[1]!, after[2]!);
  after.forEach((v, i) => assert.ok(Math.abs(v / len - before[i]!) < 1e-9));
});
