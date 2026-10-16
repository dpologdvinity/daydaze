import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_ROOM_EXITS, FOOD_STOREFRONTS } from "./storefronts.ts";
import { FOOD_VENUES } from "./venues.ts";
import {
  BUILDINGS,
  CITY_BOUNDS,
  CITY_SURFACES,
  PROPS,
} from "../city/layout.ts";
import { pointInPolygon, type Vec2 } from "../walk.ts";

function rect(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

function overlaps(a: readonly Vec2[], b: readonly Vec2[]): boolean {
  const box = (p: readonly Vec2[]) => ({
    x0: Math.min(...p.map((v) => v[0])),
    x1: Math.max(...p.map((v) => v[0])),
    z0: Math.min(...p.map((v) => v[1])),
    z1: Math.max(...p.map((v) => v[1])),
  });
  const p = box(a);
  const q = box(b);
  return p.x0 < q.x1 && q.x0 < p.x1 && p.z0 < q.z1 && q.z0 < p.z1;
}

test("every venue gets exactly one storefront in the city", () => {
  assert.equal(FOOD_STOREFRONTS.length, FOOD_VENUES.length);
  const ids = new Set(FOOD_STOREFRONTS.map((b) => b.id));
  assert.equal(ids.size, FOOD_STOREFRONTS.length);
});

test("storefronts stay inside the city and clear of roads and sidewalks", () => {
  for (const b of FOOD_STOREFRONTS) {
    for (const [x, z] of b.footprint) {
      assert.ok(pointInPolygon(CITY_BOUNDS, [x, z]), `${b.id} off the map`);
    }
    for (const surface of CITY_SURFACES) {
      assert.equal(
        overlaps(b.footprint, surface.polygon),
        false,
        `${b.id} on ${surface.kind}`,
      );
    }
  }
});

test("storefronts do not overlap any existing building or street prop", () => {
  for (const b of FOOD_STOREFRONTS) {
    for (const other of BUILDINGS.filter((o) => !o.id.startsWith("food-"))) {
      assert.equal(
        overlaps(b.footprint, other.footprint),
        false,
        `${b.id} vs ${other.id}`,
      );
    }
    for (const prop of PROPS) {
      const [x, z] = prop.position;
      const post = rect(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
      assert.equal(overlaps(b.footprint, post), false, `${b.id} vs prop`);
    }
  }
});

test("storefronts do not overlap each other", () => {
  for (let i = 0; i < FOOD_STOREFRONTS.length; i++) {
    for (let j = i + 1; j < FOOD_STOREFRONTS.length; j++) {
      assert.equal(
        overlaps(FOOD_STOREFRONTS[i].footprint, FOOD_STOREFRONTS[j].footprint),
        false,
        `${i} vs ${j}`,
      );
    }
  }
});

test("each interior room has one street door on a sidewalk, with a landing", () => {
  assert.ok(FOOD_ROOM_EXITS.length >= 3);
  const rooms = FOOD_ROOM_EXITS.map((e) => e.room);
  assert.equal(new Set(rooms).size, rooms.length);
  for (const exit of FOOD_ROOM_EXITS) {
    const onSidewalk = CITY_SURFACES.some(
      (s) => s.kind === "sidewalk" && pointInPolygon(s.polygon, exit.door),
    );
    assert.ok(onSidewalk, `${exit.room} door is on a sidewalk`);
    const landed = CITY_SURFACES.some(
      (s) => s.kind === "sidewalk" && pointInPolygon(s.polygon, exit.landing),
    );
    assert.ok(landed, `${exit.room} landing is on a sidewalk`);
    const doors = FOOD_STOREFRONTS.filter((b) => b.door?.target === exit.room);
    assert.equal(doors.length, 1, `${exit.room} has one door`);
  }
});

test("venues stand in their own neighbourhood once it is built", () => {
  for (const venue of FOOD_VENUES) {
    const shop = FOOD_STOREFRONTS.find((b) => b.id === `food-${venue.id}`);
    assert.ok(shop, venue.id);
    if (["little-manila", "chinatown-koreatown"].includes(venue.neighborhood))
      assert.equal(shop.neighborhood, venue.neighborhood, venue.id);
  }
  // the Filipino canteen's door is in Little Manila, the boba cafe's in Chinatown
  const door = (room: string) => FOOD_ROOM_EXITS.find((e) => e.room === room);
  assert.ok((door("filipino-joint")?.door[0] ?? 0) < -192);
  assert.ok((door("ube-bakery")?.door[0] ?? 0) < -192);
  assert.ok((door("boba-matcha")?.door[0] ?? 0) > 192);
});
