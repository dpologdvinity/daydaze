import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, clampToArea, isBlocked, stepInArea } from "../area.ts";
import { isRoomId, ROOMS } from "../rooms.ts";
import { portalAt } from "../portals.ts";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import {
  BOARDWALK,
  BUILDINGS,
  CITY_AREA,
  CITY_BOUNDS,
  CITY_SPAWN,
  CITY_SURFACES,
  PROPS,
  ROAD_EDGES,
  ROAD_NODES,
  SHORE_Z,
  WATER_Z,
  roadRect,
  sidewalkRects,
} from "./layout.ts";

type Box = { x0: number; z0: number; x1: number; z1: number };

function boxOf(poly: readonly Vec2[]): Box {
  const xs = poly.map(([x]) => x);
  const zs = poly.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    z0: Math.min(...zs),
    x1: Math.max(...xs),
    z1: Math.max(...zs),
  };
}

/** Rectangles that share area; touching edges do not count. */
function overlaps(a: Box, b: Box): boolean {
  return (
    a.x0 < b.x1 - 1e-9 &&
    b.x0 < a.x1 - 1e-9 &&
    a.z0 < b.z1 - 1e-9 &&
    b.z0 < a.z1 - 1e-9
  );
}

const ROAD_BOXES = [...ROAD_EDGES.map((e) => boxOf(roadRect(e)))];
const SIDEWALK_BOXES = ROAD_EDGES.flatMap((e) =>
  sidewalkRects(e).map((p) => boxOf(p)),
);
const SURFACE_BOXES = CITY_SURFACES.map((s) => boxOf(s.polygon));

test("every door targets a registered room and lands on walkable ground there", () => {
  const doors = BUILDINGS.flatMap((b) => (b.door ? [b.door] : []));
  assert.ok(doors.length >= 1);
  for (const door of doors) {
    assert.equal(isRoomId(door.target), true, door.label);
    const room = ROOMS[door.target];
    const area = areaOf(room);
    assert.deepEqual(
      clampToArea(area, door.targetSpawn.position),
      door.targetSpawn.position,
      `${door.label} lands off the walkable ground`,
    );
  }
});

test("every city door is a portal the walk rules can fire", () => {
  for (const b of BUILDINGS) {
    if (!b.door) continue;
    const hit = portalAt(CITY_AREA, b.door.position);
    assert.ok(hit, `${b.id} door is not a portal`);
    assert.equal(hit.target, b.door.target);
  }
});

test("the road graph is connected", () => {
  const seen = new Set([ROAD_NODES[0].id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of ROAD_EDGES) {
      if (seen.has(e.from) !== seen.has(e.to)) {
        seen.add(e.from);
        seen.add(e.to);
        grew = true;
      }
    }
  }
  assert.equal(seen.size, ROAD_NODES.length);
});

test("every road edge joins two nodes along a straight line", () => {
  const nodes = new Map(ROAD_NODES.map((n) => [n.id, n.position]));
  for (const e of ROAD_EDGES) {
    const a = nodes.get(e.from);
    const b = nodes.get(e.to);
    assert.ok(a && b, `${e.from}-${e.to} has a missing node`);
    assert.ok(a[0] === b[0] || a[1] === b[1], `${e.from}-${e.to} is diagonal`);
    assert.ok(e.lanes >= 1 && e.speedLimit > 0 && e.width > 0);
  }
});

test("no building footprint overlaps a road, a sidewalk or another footprint", () => {
  const footprints = BUILDINGS.map((b) => ({
    id: b.id,
    box: boxOf(b.footprint),
  }));
  for (const { id, box } of footprints) {
    for (const road of ROAD_BOXES)
      assert.equal(overlaps(box, road), false, `${id} on a road`);
    for (const walk of SIDEWALK_BOXES)
      assert.equal(overlaps(box, walk), false, `${id} on a sidewalk`);
    for (const surface of SURFACE_BOXES)
      assert.equal(overlaps(box, surface), false, `${id} on a surface`);
  }
  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      assert.equal(
        overlaps(footprints[i].box, footprints[j].box),
        false,
        `${footprints[i].id} overlaps ${footprints[j].id}`,
      );
    }
  }
});

test("every surface and footprint sits inside the city bounds", () => {
  const bounds = boxOf(CITY_BOUNDS);
  for (const s of CITY_AREA.surfaces) {
    const box = boxOf(s);
    assert.ok(box.x0 >= bounds.x0 && box.x1 <= bounds.x1, "surface x");
    assert.ok(box.z0 >= bounds.z0 && box.z1 <= bounds.z1, "surface z");
  }
  for (const b of BUILDINGS) {
    const box = boxOf(b.footprint);
    assert.ok(box.x0 >= bounds.x0 && box.x1 <= bounds.x1, `${b.id} x`);
    assert.ok(box.z0 >= bounds.z0 && box.z1 <= bounds.z1, `${b.id} z`);
  }
  // Little Manila to the west, Downtown and Nightlife Row, Beachside south
  assert.ok(bounds.x1 - bounds.x0 >= 630 && bounds.x1 - bounds.x0 <= 650);
});

test("the spawn is walkable and not blocked", () => {
  assert.equal(
    CITY_AREA.surfaces.some((s) => pointInPolygon(s, CITY_SPAWN.position)),
    true,
  );
  assert.equal(isBlocked(CITY_AREA, CITY_SPAWN.position), false);
});

test("the Velvet Room's exit leads to the sidewalk outside its door, not into the door's trigger", () => {
  const exit = ROOMS["velvet-room"].portals.find((p) => p.target === "city");
  assert.ok(exit, "the Velvet Room needs an exit to the city");
  const door = BUILDINGS.find((b) => b.id === "velvet-room")?.door;
  assert.ok(door);
  const at = exit.targetSpawn.position;
  assert.equal(
    CITY_AREA.surfaces.some((s) => pointInPolygon(s, at)),
    true,
  );
  assert.equal(isBlocked(CITY_AREA, at), false);
  const gap = Math.hypot(at[0] - door.position[0], at[1] - door.position[1]);
  assert.ok(gap > door.radius, "arrival would re-enter the door at once");
});

test("walking up from the sidewalk through the Velvet Room's door fires the portal", () => {
  const door = BUILDINGS.find((b) => b.id === "velvet-room")?.door;
  assert.ok(door);
  let pos: Vec2 = [door.position[0], -9];
  let fired: string | null = null;
  for (let step = 0; step < 200 && fired === null; step++) {
    pos = stepInArea(CITY_AREA, pos, door.position, 0.2);
    fired = portalAt(CITY_AREA, pos)?.target ?? null;
  }
  assert.equal(fired, "velvet-room");
});

test("tapping the door itself walks to it", () => {
  const door = BUILDINGS.find((b) => b.id === "velvet-room")?.door;
  assert.ok(door);
  assert.equal(
    portalAt(CITY_AREA, clampToArea(CITY_AREA, door.position))?.target,
    "velvet-room",
  );
});

test("street props stand on sidewalks, never in the road", () => {
  for (const prop of PROPS) {
    const [x, z] = prop.position;
    const spot: Box = {
      x0: x - 0.01,
      z0: z - 0.01,
      x1: x + 0.01,
      z1: z + 0.01,
    };
    for (const road of ROAD_BOXES)
      assert.equal(overlaps(spot, road), false, `${prop.kind} at ${x},${z}`);
  }
});

test("each venue gate's door fires from the sidewalk, and the venue's exit leads back outside it", () => {
  for (const [gateId, venue] of [
    ["carnival-gate", "amusement-park"],
    ["splash-gate", "water-park"],
    ["speedway-gate", "speedway"],
  ] as const) {
    const door = BUILDINGS.find((b) => b.id === gateId)?.door;
    assert.ok(door, `${gateId} has a door`);
    assert.equal(door.target, venue);
    let pos: Vec2 = [door.position[0], -9];
    let fired: string | null = null;
    for (let step = 0; step < 200 && fired === null; step++) {
      pos = stepInArea(CITY_AREA, pos, door.position, 0.2);
      fired = portalAt(CITY_AREA, pos)?.target ?? null;
    }
    assert.equal(fired, venue, gateId);
    const back = ROOMS[venue].portals.find((p) => p.target === "city");
    assert.ok(back, `${venue} has a way back to the city`);
    assert.equal(
      isBlocked(CITY_AREA, back.targetSpawn.position),
      false,
      gateId,
    );
    const gap = Math.hypot(
      back.targetSpawn.position[0] - door.position[0],
      back.targetSpawn.position[1] - door.position[1],
    );
    assert.ok(gap > door.radius, `${gateId} arrival would re-enter at once`);
  }
});

test("the water park's swimwear flag applies to arrivals through its gate", () => {
  const door = BUILDINGS.find((b) => b.id === "splash-gate")?.door;
  assert.ok(door);
  // the doll's outfit is chosen from the room a visit lands in, so the gate's
  // arrival is a swimwear room exactly when the water park is
  assert.equal(ROOMS[door.target].swimwear, true);
});

test("Beachside: the cross streets run down to Shore Boulevard, and the boardwalk and sand are walkable", () => {
  for (const id of ["a-shore", "b-shore"]) {
    const edges = ROAD_EDGES.filter((e) => e.from === id || e.to === id);
    assert.equal(edges.length, 3, `${id} is a T junction`);
  }
  for (const p of [
    [0, BOARDWALK.z0 + 1],
    [0, (BOARDWALK.z1 + WATER_Z) / 2],
  ] as const)
    assert.equal(isBlocked(CITY_AREA, p), false, `${p}`);
  assert.deepEqual(clampToArea(CITY_AREA, [0, 300]), [0, 300]);
  // the water itself is not walkable
  assert.notDeepEqual(clampToArea(CITY_AREA, [0, WATER_Z + 10]), [
    0,
    WATER_Z + 10,
  ]);
  for (const b of BUILDINGS.filter((b) => b.neighborhood === "beachside"))
    assert.ok(
      b.footprint.every(([, z]) => z < SHORE_Z),
      b.id,
    );
});
