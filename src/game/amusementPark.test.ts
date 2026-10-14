import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARK_LINES,
  buildTrack,
  parseRide,
  dropTowerHeight,
  ferrisSeat,
  lineAt,
  rideProgress,
  rideSeconds,
  stringPoints,
  trackPose,
  type Vec3,
} from "./amusementPark.ts";

function assertNear(actual: readonly number[], expected: readonly number[]) {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => {
    assert.ok(Math.abs(v - expected[i]) < 1e-9, `${actual} vs ${expected}`);
  });
}

test("calm rides take longer than normal rides", () => {
  for (const ride of ["ferris-wheel", "coaster"] as const) {
    const normal = rideSeconds(ride, false);
    const calm = rideSeconds(ride, true);
    assert.ok(normal > 0);
    assert.ok(calm > normal, ride);
  }
});

test("ride progress is clamped and bad input counts as the start", () => {
  assert.equal(rideProgress(0, 20), 0);
  assert.equal(rideProgress(10, 20), 0.5);
  assert.equal(rideProgress(99, 20), 1);
  assert.equal(rideProgress(-3, 20), 0);
  assert.equal(rideProgress(Number.NaN, 20), 0);
  assert.equal(rideProgress(5, 0), 0);
});

test("the ferris wheel loads at the bottom and rides the rim", () => {
  const wheel = { hub: [-6, 9, -9] as const, radius: 7 };
  assertNear(ferrisSeat(wheel, 0).position, [-6, 2, -9]);
  assertNear(ferrisSeat(wheel, 0.5).position, [-6, 16, -9]);
  assertNear(ferrisSeat(wheel, 1).position, [-6, 2, -9]);
  for (let i = 0; i <= 20; i++) {
    const [x, y, z] = ferrisSeat(wheel, i / 20).position;
    assert.ok(Math.abs(Math.hypot(x + 6, y - 9) - 7) < 1e-9);
    assert.equal(z, -9);
  }
});

const LOOP: readonly Vec3[] = [
  [0, 1, 0],
  [10, 4, 0],
  [12, 9, 8],
  [4, 12, 12],
  [-4, 6, 9],
  [-6, 1, 3],
];

test("a closed track loops back to its start", () => {
  const track = buildTrack(LOOP);
  assert.equal(track.samples.length, LOOP.length * 16);
  assertNear(trackPose(track, 0).position, [0, 1, 0]);
  assertNear(trackPose(track, track.length).position, [0, 1, 0]);
  assertNear(trackPose(track, -track.length).position, [0, 1, 0]);
  assert.ok(track.length > 50, `length ${track.length}`);
});

test("the track passes through each control point", () => {
  const track = buildTrack(LOOP);
  for (let i = 0; i < LOOP.length; i++) {
    const at = track.distances[i * 16];
    assertNear(trackPose(track, at).position, LOOP[i]);
  }
});

test("track headings point along the way the rider travels", () => {
  const track = buildTrack(LOOP);
  const a = trackPose(track, 1);
  const b = trackPose(track, 2);
  const moved = [b.position[0] - a.position[0], b.position[2] - a.position[2]];
  assert.ok(moved[0] * Math.sin(a.yaw) + moved[1] * Math.cos(a.yaw) > 0);
});

test("the drop tower rests, lifts, holds, drops and repeats", () => {
  const bottom = 0.5;
  const top = 18;
  assert.equal(dropTowerHeight(0, bottom, top), bottom);
  let peak = 0;
  for (let t = 0; t < 40; t += 0.05) {
    const h = dropTowerHeight(t, bottom, top);
    assert.ok(h >= bottom - 1e-9 && h <= top + 1e-9, `${t}: ${h}`);
    peak = Math.max(peak, h);
  }
  assert.ok(Math.abs(peak - top) < 1e-9);
  // the cycle repeats exactly
  assert.ok(
    Math.abs(
      dropTowerHeight(3.3, bottom, top) - dropTowerHeight(3.3 + 8, bottom, top),
    ) < 1e-9,
  );
});

test("string lights space bulbs between two anchors and sag", () => {
  const a: Vec3 = [0, 4, 0];
  const b: Vec3 = [6, 4, 0];
  const bulbs = stringPoints(a, b, 0.5, 1);
  assert.ok(bulbs.length >= 10 && bulbs.length <= 14, `${bulbs.length}`);
  for (const [x, y] of bulbs) {
    assert.ok(x > 0 && x < 6);
    assert.ok(y < 4 && y > 3, `${y}`);
  }
  // a quadratic curve reaches half its control depth at the middle
  const middle = bulbs[Math.floor(bulbs.length / 2)];
  assert.ok(
    Math.abs(middle[1] - 3.5) < 0.05,
    `the middle sags, got ${middle[1]}`,
  );
});

test("every NPC has at least six handwritten lines with no duplicates", () => {
  for (const [id, lines] of Object.entries(PARK_LINES)) {
    assert.ok(lines.length >= 6, `${id} has ${lines.length} lines`);
    assert.equal(new Set(lines).size, lines.length, `${id} repeats a line`);
    for (const line of lines) {
      assert.equal(line, line.trim(), `${id}: whitespace`);
      assert.ok(line.length > 10 && line.length < 140, `${id}: ${line}`);
    }
  }
});

test("line banks avoid AI and platform wording and any placeholders", () => {
  const banned = /as an ai|language model|chatgpt|openai|\{[a-z]+\}|\bai\b/i;
  for (const lines of Object.values(PARK_LINES)) {
    for (const line of lines) assert.doesNotMatch(line, banned, line);
  }
});

test("lineAt cycles through a bank in order and wraps", () => {
  const bank = ["one", "two", "three"];
  assert.equal(lineAt(bank, 0), "one");
  assert.equal(lineAt(bank, 2), "three");
  assert.equal(lineAt(bank, 3), "one");
  assert.equal(lineAt(bank, -1), "three");
  assert.equal(lineAt([], 4), "");
});

test("parseRide accepts only the rides in the park", () => {
  assert.equal(parseRide("coaster"), "coaster");
  assert.equal(parseRide("ferris-wheel"), "ferris-wheel");
  for (const value of ["toString", "Coaster", "", null]) {
    assert.equal(parseRide(value), null, String(value));
  }
});
