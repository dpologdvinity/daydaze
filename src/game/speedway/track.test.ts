import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestPointOnPolygon, pointInPolygon, type Vec2 } from "../walk.ts";
import { TRACKS, trackWalls } from "./track.ts";

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

test("there are two tracks with unique ids", () => {
  assert.equal(TRACKS.length, 2);
  assert.equal(new Set(TRACKS.map((t) => t.id)).size, 2);
});

for (const track of TRACKS) {
  test(`${track.name}: the centerline is a closed loop with no self-intersection`, () => {
    const pts = track.centerline;
    assert.ok(pts.length >= 16);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue; // closing segment neighbours the first
        assert.ok(
          !segmentsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]),
          `segments ${i} and ${j} cross`,
        );
      }
    }
  });

  test(`${track.name}: grid slots lie on the track and clear of the barriers`, () => {
    assert.ok(track.grid.length >= 6);
    const walls = trackWalls(track);
    for (const slot of track.grid) {
      const onLine = nearestPointOnPolygon(track.centerline, slot.position);
      assert.ok(
        Math.hypot(onLine[0] - slot.position[0], onLine[1] - slot.position[1]) <
          track.width / 2,
      );
      for (const wall of walls) assert.ok(!pointInPolygon(wall, slot.position));
    }
  });

  test(`${track.name}: the centerline never runs inside a barrier`, () => {
    const walls = trackWalls(track);
    for (const p of track.centerline)
      for (const wall of walls) assert.ok(!pointInPolygon(wall, p));
  });

  test(`${track.name}: checkpoint 0 is the start line and each spans the road`, () => {
    assert.ok(track.checkpoints.length >= 4);
    for (const cp of track.checkpoints) {
      assert.ok(
        Math.hypot(cp.b[0] - cp.a[0], cp.b[1] - cp.a[1]) >= track.width,
      );
    }
  });
}
