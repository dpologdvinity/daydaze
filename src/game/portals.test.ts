import { test } from "node:test";
import assert from "node:assert/strict";
import { arrive, portalAt } from "./portals.ts";
import { ROOMS, isRoomId, type RoomDefinition } from "./rooms.ts";
import { pointInPolygon } from "./walk.ts";

const room: RoomDefinition = {
  id: "plaza",
  name: "Test Room",
  walkable: [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ],
  spawn: { position: [5, 5], yaw: 0 },
  portals: [
    {
      id: "a",
      position: [1, 1],
      radius: 0.5,
      label: "A",
      target: "velvet-room",
      targetSpawn: { position: [0, 0], yaw: 0 },
    },
    {
      id: "b",
      position: [9, 9],
      radius: 1,
      label: "B",
      target: "velvet-room",
      targetSpawn: { position: [0, 0], yaw: 0 },
    },
  ],
};

test("portalAt finds the portal whose radius contains the point", () => {
  assert.equal(portalAt(room, [1, 1])?.id, "a");
  assert.equal(portalAt(room, [1.5, 1])?.id, "a");
  assert.equal(portalAt(room, [8.4, 8.4])?.id, "b");
  assert.equal(portalAt(room, [1.6, 1]), null);
  assert.equal(portalAt(room, [5, 5]), null);
});

test("portalAt returns null for non-finite points", () => {
  for (const n of [Number.NaN, Infinity, -Infinity]) {
    assert.equal(portalAt(room, [n, 1]), null);
    assert.equal(portalAt(room, [1, n]), null);
  }
});

test("arrive clamps the spawn into the target room", () => {
  assert.deepEqual(arrive(room, { position: [3, 4], yaw: 1 }), {
    position: [3, 4],
    yaw: 1,
  });
  assert.deepEqual(arrive(room, { position: [12, 4], yaw: -1 }), {
    position: [10, 4],
    yaw: -1,
  });
});

test("arrive never returns NaN", () => {
  const { position, yaw } = arrive(room, {
    position: [Number.NaN, 2],
    yaw: Number.NaN,
  });
  assert.equal(pointInPolygon(room.walkable, position), true);
  assert.equal(yaw, 0);
});

const rooms = Object.values(ROOMS);

function assertSafeArrival(target: RoomDefinition, label: string) {
  return (position: readonly [number, number]) => {
    assert.equal(
      pointInPolygon(target.walkable, position),
      true,
      `${label} is outside ${target.id}`,
    );
    assert.equal(
      portalAt(target, position),
      null,
      `${label} re-triggers a portal in ${target.id}`,
    );
  };
}

test("every room spawn is walkable and clear of portals", () => {
  for (const r of rooms) {
    assertSafeArrival(r, `${r.id} spawn`)(r.spawn.position);
  }
});

test("every portal leads to a real room with a safe target spawn", () => {
  for (const r of rooms) {
    for (const portal of r.portals) {
      assert.equal(isRoomId(portal.target), true, portal.id);
      assertSafeArrival(
        ROOMS[portal.target],
        `${portal.id} target spawn`,
      )(portal.targetSpawn.position);
    }
  }
});

test("every portal is reachable from inside its room", () => {
  for (const r of rooms) {
    for (const portal of r.portals) {
      assert.equal(
        pointInPolygon(r.walkable, portal.position),
        true,
        `${portal.id} center is not walkable`,
      );
    }
  }
});

test("every portal from A to B has a return portal from B to A", () => {
  for (const r of rooms) {
    for (const portal of r.portals) {
      const back = ROOMS[portal.target].portals.some((p) => p.target === r.id);
      assert.ok(back, `${portal.id} has no way back from ${portal.target}`);
    }
  }
});

test("portal ids are unique across rooms", () => {
  const ids = rooms.flatMap((r) => r.portals.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length);
});
