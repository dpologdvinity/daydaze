import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FACE_HEIGHT,
  CHEST_HEIGHT,
  MIN_ZOOM,
  KEY_ZOOM_STEP,
  PORTRAIT_ELEVATION,
  PORTRAIT_FOV,
  WIDE_FOV,
  GAZE_MAX,
  faceHeightOf,
  focusHeight,
  gazeTurn,
  keyZoomNotches,
  portraitAmount,
  portraitFov,
  portraitTarget,
  pullInside,
  roomInside,
  swingToFront,
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
    dist(camera, face) < MIN_ZOOM + 0.05,
    `camera ${dist(camera, face)} m from her face`,
  );
  assert.ok(
    dist(target, face) < 0.8,
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

// ---------------------------------------------------------------- portraits

test("the portrait grows from nothing at a distance to full at the nearest zoom", () => {
  assert.equal(portraitAmount(40), 0);
  assert.equal(portraitAmount(3), 0);
  assert.equal(portraitAmount(MIN_ZOOM), 1);
  assert.equal(portraitAmount(0.1), 1);
  let last = 0;
  for (let d = 3; d >= MIN_ZOOM; d -= 0.1) {
    const t = portraitAmount(d);
    assert.ok(t >= last, `not monotonic at ${d}`);
    last = t;
  }
});

test("close in, the lens narrows for a flattering face, and widens again going out", () => {
  assert.equal(portraitFov(20), WIDE_FOV);
  assert.equal(portraitFov(MIN_ZOOM), PORTRAIT_FOV);
  assert.ok(PORTRAIT_FOV < WIDE_FOV);
  assert.ok(portraitFov(1.5) < WIDE_FOV && portraitFov(1.5) > PORTRAIT_FOV);
});

test("the nearest portrait fills a good part of the frame with her face, and no more", () => {
  // the head is about 0.24 m tall; the frame's height at the nearest zoom
  const frame = 2 * MIN_ZOOM * Math.tan((PORTRAIT_FOV * Math.PI) / 360);
  const share = 0.24 / frame;
  assert.ok(
    share > 0.5,
    `her head is ${Math.round(share * 100)}% of the frame`,
  );
  assert.ok(
    share < 0.85,
    `her head is ${Math.round(share * 100)}% of the frame`,
  );
});

test("the view swings onto her face as the camera closes in, from an off-center overview", () => {
  const face: Vec3 = [4, FACE_HEIGHT, -2];
  const aimedAt: Vec3 = [-6, 1, -12]; // the room's overview looks elsewhere
  assert.deepEqual(portraitTarget(aimedAt, face, 30), aimedAt);
  const part = portraitTarget(aimedAt, face, 1.5);
  assert.ok(dist(part, face) < dist(aimedAt, face));
  assert.ok(dist(part, face) > 0);
  const near = portraitTarget(aimedAt, face, MIN_ZOOM);
  assert.ok(dist(near, face) < 1e-9);
});

// ----------------------------------------------------------------- keyboard

test("plus and minus zoom in and out, one notch a press; other keys do nothing", () => {
  assert.equal(keyZoomNotches("+"), 1);
  assert.equal(keyZoomNotches("="), 1);
  assert.equal(keyZoomNotches("-"), -1);
  assert.equal(keyZoomNotches("_"), -1);
  assert.equal(keyZoomNotches("a"), 0);
  assert.equal(keyZoomNotches("Enter"), 0);
  assert.ok(KEY_ZOOM_STEP < 1 && KEY_ZOOM_STEP > 0.5);
});

// -------------------------------------------------------------------- walls

test("a camera inside the walls is left alone", () => {
  const room = (x: number, z: number) => Math.abs(x) < 5 && Math.abs(z) < 5;
  const cam: Vec3 = [1, 1.6, 1];
  assert.deepEqual(pullInside(cam, [0, 1.5, 0], room), cam);
});

test("a camera that would end up inside a wall is pulled back toward her until it clears it", () => {
  const room = (x: number, z: number) => Math.abs(x) < 5 && Math.abs(z) < 5;
  const her: Vec3 = [4, 1.5, 0];
  const pulled = pullInside([7, 2, 0], her, room);
  assert.ok(room(pulled[0], pulled[2]));
  // as far out as the wall allows, not all the way in on her
  assert.ok(pulled[0] > 4.9, `x ${pulled[0]}`);
  // along the same line
  assert.ok(Math.abs(pulled[2]) < 1e-6);
  assert.ok(pulled[1] > her[1] && pulled[1] < 2);
});

test("with her outside the walls too (a seat, a ride) the camera is not touched", () => {
  const room = (x: number, z: number) => Math.abs(x) < 5 && Math.abs(z) < 5;
  const cam: Vec3 = [9, 2, 0];
  assert.deepEqual(pullInside(cam, [8, 1.5, 0], room), cam);
});

test("a room's inside is its floor plus a wall's depth", () => {
  const floor: [number, number][] = [
    [-5, -5],
    [5, -5],
    [5, 5],
    [-5, 5],
  ];
  const inside = roomInside(floor, 0.35);
  assert.equal(inside(0, 0), true);
  assert.equal(inside(5.2, 0), true);
  assert.equal(inside(5.5, 0), false);
  assert.equal(inside(-5.2, -5.2), true);
});

// ------------------------------------------------------------- the front view

const facing = (face: Vec3, cam: Vec3) =>
  Math.atan2(cam[0] - face[0], cam[2] - face[2]);
const elevation = (face: Vec3, cam: Vec3) =>
  Math.atan2(cam[1] - face[1], Math.hypot(cam[0] - face[0], cam[2] - face[2]));

test("a portrait is taken from the front at eye level: the camera comes round to where she faces and down to her eyes", () => {
  const face: Vec3 = [2, 1.55, 3];
  const yaw = 0.9; // she faces (sin 0.9, cos 0.9)
  // behind her and high above, as a room's overview sees her
  const high: Vec3 = [2 - Math.sin(yaw) * 1.5, 3.5, 3 - Math.cos(yaw) * 1.5];
  const full = swingToFront(high, face, yaw, 1);
  assert.ok(Math.abs(facing(face, full) - yaw) < 1e-9);
  assert.ok(Math.abs(elevation(face, full) - PORTRAIT_ELEVATION) < 1e-9);
  // the distance from her face is kept
  assert.ok(Math.abs(dist(full, face) - dist(high, face)) < 1e-9);
  assert.deepEqual(swingToFront(high, face, yaw, 0), high);
});

test("a partial swing turns part of the way, by the short way round", () => {
  const face: Vec3 = [0, 1.55, 0];
  // 170 degrees one way of the front, with the front at -170: 20 degrees apart
  const cam: Vec3 = [Math.sin(2.97) * 2, 1.55, Math.cos(2.97) * 2];
  const yaw = -2.97;
  const half = swingToFront(cam, face, yaw, 0.5);
  const turned = Math.abs(
    Math.atan2(
      Math.sin(facing(face, half) - 2.97),
      Math.cos(facing(face, half) - 2.97),
    ),
  );
  assert.ok(
    Math.abs(turned - (2 * Math.PI - 2 * 2.97) / 2) < 1e-6,
    `${turned}`,
  );
  const lower = swingToFront([2, 3.5, 0], face, 0, 0.5);
  assert.ok(elevation(face, lower) > PORTRAIT_ELEVATION);
  assert.ok(elevation(face, lower) < elevation(face, [2, 3.5, 0]));
});

test("already in front at eye level the camera stays; straight above her it is left alone", () => {
  const face: Vec3 = [0, 1.55, 0];
  const r = 1.2 * Math.cos(PORTRAIT_ELEVATION);
  const front: Vec3 = [
    Math.sin(0.4) * r,
    face[1] + 1.2 * Math.sin(PORTRAIT_ELEVATION),
    Math.cos(0.4) * r,
  ];
  const same = swingToFront(front, face, 0.4, 1);
  assert.ok(same.every((v, i) => Math.abs(v - front[i]!) < 1e-9));
  const above: Vec3 = [0, 5, 0];
  assert.deepEqual(swingToFront(above, face, 1, 1), above);
});

test("the portrait aims at this doll's eyes: the man's are higher, a seated doll's lower", () => {
  assert.ok(faceHeightOf("masculine", false) > faceHeightOf("feminine", false));
  assert.ok(
    faceHeightOf("feminine", true) < faceHeightOf("feminine", false) - 0.3,
  );
  assert.equal(focusHeight(MIN_ZOOM, 1.3), 1.3);
  assert.equal(focusHeight(40, 1.3), CHEST_HEIGHT);
});

test("the nearest portrait frames her whole head, chin to the top of her hair", () => {
  // the woman's chin is at about 1.37 m, her hair's top about 1.67 m
  const aim = faceHeightOf("feminine", false);
  const half = MIN_ZOOM * Math.tan((PORTRAIT_FOV * Math.PI) / 360);
  assert.ok(aim + half > 1.67 + 0.02, `the frame's top is ${aim + half}`);
  assert.ok(aim - half < 1.37 - 0.02, `the frame's bottom is ${aim - half}`);
});

test("in a portrait she looks into the camera; out of one, or with it behind her, she does not", () => {
  // a small look away is made up in full, a big one only so far
  assert.equal(gazeTurn(0.2, 0.3, 1), 0.2);
  assert.equal(gazeTurn(1.2, 0.3, 1), GAZE_MAX);
  // half a portrait, half the turn
  assert.equal(gazeTurn(0.2, 0.3, 0.5), 0.1);
  // no portrait, no turn
  assert.equal(gazeTurn(0.4, 0.3, 0), 0);
  // the camera behind her: she does not twist round to it
  assert.equal(gazeTurn(0.4, Math.PI, 1), 0);
  // and the turn fades out as the camera goes round her side, never snaps
  let last = gazeTurn(0.4, 0, 1);
  for (let side = 0; side <= Math.PI; side += 0.05) {
    const turn = gazeTurn(0.4, side, 1);
    assert.ok(turn <= last + 1e-9 && last - turn < 0.1, `at ${side}`);
    last = turn;
  }
});
