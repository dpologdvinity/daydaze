import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, isRoomId } from "./rooms.ts";
import { pointInPolygon, type Vec2 } from "./walk.ts";

test("every room is registered under its own id", () => {
  assert.deepEqual(Object.keys(ROOMS).sort(), ["mango-room", "plaza"]);
  for (const [id, room] of Object.entries(ROOMS)) assert.equal(room.id, id);
});

test("isRoomId accepts registered rooms only", () => {
  assert.equal(isRoomId("mango-room"), true);
  assert.equal(isRoomId("plaza"), true);
  for (const value of ["toString", "constructor", "Plaza", "", null, 1, {}]) {
    assert.equal(isRoomId(value), false, String(value));
  }
});

test("the Mango Room keeps the player out of the bar and the booth", () => {
  const { walkable, spawn } = ROOMS["mango-room"];
  // The prototype start point and the open dance floor stay walkable.
  assert.equal(pointInPolygon(walkable, spawn.position), true);
  assert.deepEqual(spawn.position, [0.9, 1.6]);
  assert.equal(pointInPolygon(walkable, [-2.4, 1.5]), true);
  // Bar counter runs x -3.9..2.3 at z -4.7 with stools at z -4.05.
  for (const x of [-3.9, -2.3, -0.8, 0.5, 2.3]) {
    assert.equal(pointInPolygon(walkable, [x, -4.05]), false);
    assert.equal(pointInPolygon(walkable, [x, -4.7]), false);
  }
  // The booth seats everything within 1.9 m of its centre.
  const booth: Vec2 = [4.2, 0.7];
  for (let a = 0; a < 360; a += 5) {
    const r = (a * Math.PI) / 180;
    const p: Vec2 = [
      booth[0] + 1.89 * Math.cos(r),
      booth[1] + 1.89 * Math.sin(r),
    ];
    assert.equal(pointInPolygon(walkable, p), false, `booth edge at ${a}°`);
  }
  // Walls: side walls at x = +-6, back wall at z = -6.
  for (const p of [
    [-5.9, 0],
    [5.9, 4],
    [0, -5.9],
    [0, 5.9],
  ] satisfies Vec2[]) {
    assert.equal(pointInPolygon(walkable, p), false);
  }
});

test("the Plaza is a concave street about 24 m by 14 m", () => {
  const { walkable } = ROOMS.plaza;
  const xs = walkable.map(([x]) => x);
  const zs = walkable.map(([, z]) => z);
  assert.equal(Math.max(...xs) - Math.min(...xs), 24);
  assert.equal(Math.max(...zs) - Math.min(...zs), 14);
  // A concave polygon turns both left and right as you walk its edges.
  const n = walkable.length;
  const turns = walkable.map(([bx, bz], i) => {
    const [ax, az] = walkable[(i + n - 1) % n];
    const [cx, cz] = walkable[(i + 1) % n];
    return Math.sign((bx - ax) * (cz - bz) - (bz - az) * (cx - bx));
  });
  assert.ok(turns.includes(1) && turns.includes(-1), "should be concave");
});

test("every room has a name and at least one portal", () => {
  for (const room of Object.values(ROOMS)) {
    assert.ok(room.name.length > 0);
    assert.ok(room.portals.length > 0);
    for (const portal of room.portals) {
      assert.ok(portal.radius > 0);
      assert.ok(portal.label.length > 0);
    }
  }
});
