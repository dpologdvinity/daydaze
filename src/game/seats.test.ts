import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "./rooms.ts";
import { SEATS, homeSeats, seatsIn } from "./seats.ts";
import { pointInPolygon } from "./walk.ts";
import { DINER_SEATS as KAMAYAN_DINERS } from "./kamayanHall.ts";
import { DINER_SEATS as GALLERIA_DINERS } from "./galleria.ts";

test("every seat's approach point is on its room's floor", () => {
  for (const s of SEATS) {
    const room = ROOMS[s.room];
    assert.ok(room, `${s.id}: unknown room`);
    assert.ok(
      pointInPolygon(room.walkable, s.approach),
      `${s.id} approach is off the floor`,
    );
  }
});

test("seats face their table or bar and stand half a metre in front", () => {
  for (const s of SEATS) {
    const d = Math.hypot(s.approach[0] - s.at[0], s.approach[1] - s.at[1]);
    assert.ok(Math.abs(d - 0.5) < 1e-9);
    assert.ok(s.height > 0.3 && s.height < 1.0);
  }
  assert.equal(new Set(SEATS.map((s) => s.id)).size, SEATS.length);
  assert.equal(seatsIn("velvet-room").length, 5);
});

test("a sofa in the apartment gives two seats facing out from its back", () => {
  const seats = homeSeats([{ id: "sofa", cell: [2, 1], rotation: 0 }]);
  assert.equal(seats.length, 2);
  for (const s of seats) {
    assert.equal(s.room, "apartment");
    // facing +z, approached from the front
    assert.ok(s.approach[1] > s.at[1]);
  }
  assert.equal(
    homeSeats([{ id: "lamp", cell: [0, 0], rotation: 0 }]).length,
    0,
  );
});

test("a bed is one spot to lie on, walked up to from the side nearer the middle", () => {
  const [bed] = homeSeats([{ id: "bed", cell: [0, 0], rotation: 0 }]);
  assert.ok(bed?.lie);
  // the bed's left edge is on the room's left wall: approach from its right
  assert.ok(bed.approach[0] > bed.at[0] + 1);
  assert.ok(pointInPolygon(ROOMS.apartment.walkable, bed.approach));
});

test("chairs the regulars sit in are never offered to the player", () => {
  const ids = (room: Parameters<typeof seatsIn>[0]) =>
    seatsIn(room).map((s) => s.id);
  for (const i of KAMAYAN_DINERS)
    assert.ok(!ids("kamayan-hall").includes(`kamayan-bench-${i}`));
  for (const i of GALLERIA_DINERS)
    assert.ok(!ids("galleria").includes(`galleria-chair-${i}`));
  assert.ok(!ids("boba-matcha").includes("boba-matcha-table0-l"));
  assert.ok(ids("boba-matcha").includes("boba-matcha-table0-r"));
});
