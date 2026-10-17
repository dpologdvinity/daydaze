import { test } from "node:test";
import assert from "node:assert/strict";
import { CITY_SURFACES, BUILDINGS } from "./city/layout.ts";
import { LINE_BANKS } from "./dialogue/index.ts";
import type { DialogueRole, DialogueSituation } from "./dialogue/types.ts";
import { ROOMS, type RoomId } from "./rooms.ts";
import { HOTSPOTS, hotspotsIn } from "./hotspots.ts";
import { pointInPolygon, type Vec2 } from "./walk.ts";

const NIGHTLIFE_ROOMS = [
  "pulse",
  "violet-hour",
  "sugar-rush",
  "warehouse",
  "karaoke",
] as const;

function onCityStreet(p: Vec2): boolean {
  return CITY_SURFACES.some((s) => pointInPolygon(s.polygon, p));
}

for (const id of NIGHTLIFE_ROOMS) {
  test(`${id} is registered under its own id with a way back to the street`, () => {
    const room = ROOMS[id];
    assert.equal(room.id, id);
    const exit = room.portals.find((p) => p.target === "city");
    assert.ok(exit, `${id} has no exit to the city`);
    assert.ok(
      pointInPolygon(room.walkable, exit.position),
      `${id} exit sits outside the floor`,
    );
    assert.ok(
      onCityStreet(exit.targetSpawn.position),
      `${id} exit lands off the street`,
    );
  });

  test(`${id} has a street door that opens onto a forecourt and enters the room`, () => {
    const building = BUILDINGS.find((b) => b.door?.target === id);
    assert.ok(building, `no city door targets ${id}`);
    assert.equal(building.neighborhood, "nightlife-row");
    const door = building.door;
    assert.ok(door);
    assert.ok(onCityStreet(door.position), `${id} door is not on a surface`);
    assert.ok(
      pointInPolygon(ROOMS[id].walkable, door.targetSpawn.position),
      `${id} arrival point sits outside the floor`,
    );
  });

  test(`${id} spawn point is on its own floor`, () => {
    const room = ROOMS[id];
    assert.ok(pointInPolygon(room.walkable, room.spawn.position));
  });
}

test("each nightlife venue has exactly one door in the city", () => {
  for (const id of NIGHTLIFE_ROOMS) {
    const doors = BUILDINGS.filter((b) => b.door?.target === id);
    assert.equal(doors.length, 1, id);
  }
});

test("every hotspot sits on the floor of its room and launches a known game", () => {
  for (const spot of HOTSPOTS) {
    const room: RoomId = spot.room;
    assert.ok(ROOMS[room], `${spot.id} names an unknown room`);
    assert.ok(
      pointInPolygon(ROOMS[room].walkable, spot.position),
      `${spot.id} is off the floor`,
    );
    assert.ok(spot.radius > 0 && spot.radius < 2, `${spot.id} radius`);
  }
  assert.equal(new Set(HOTSPOTS.map((s) => s.id)).size, HOTSPOTS.length);
});

test("Pulse has a DJ booth hotspot for Bassline and the Velvet Room bar has Last Call", () => {
  assert.deepEqual(
    hotspotsIn("pulse").map((s) => s.game),
    ["bassline"],
  );
  assert.deepEqual(
    hotspotsIn("velvet-room").map((s) => s.game),
    ["last-call"],
  );
});

const VENUE_LINES: Array<[string, DialogueRole, DialogueSituation]> = [
  ["pulse", "bouncer", "greeting-first"],
  ["pulse", "bouncer", "tapped"],
  ["pulse", "dj", "tapped"],
  ["pulse", "dj", "idle"],
  ["pulse", "bartender", "greeting-first"],
  ["pulse", "bartender", "action-ordering"],
  ["pulse", "club-dancer", "idle"],
  ["pulse", "club-dancer", "action-dancing-nearby"],
  ["pulse", "coat-check", "greeting-first"],
  ["violet-hour", "bouncer", "greeting-first"],
  ["violet-hour", "bouncer", "tapped"],
  ["violet-hour", "bartender", "greeting-first"],
  ["violet-hour", "bartender", "action-ordering"],
  ["violet-hour", "bartender", "tapped"],
  ["violet-hour", "regular", "idle"],
  ["violet-hour", "regular", "tapped"],
  ["violet-hour", "regular", "greeting-regular"],
];

for (const [venue, role, situation] of VENUE_LINES) {
  test(`${role} has at least 10 lines for ${situation} at ${venue}`, () => {
    const entries = LINE_BANKS[role][situation] ?? [];
    const own = entries.filter(
      (entry) =>
        typeof entry !== "string" &&
        entry.when?.venue !== undefined &&
        [entry.when.venue].flat().includes(venue),
    );
    assert.ok(
      own.length >= 10,
      `${role}/${situation} has ${own.length} for ${venue}`,
    );
  });
}
