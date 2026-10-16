import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "./rooms.ts";
import { SEATS, seatsIn } from "./seats.ts";
import { pointInPolygon } from "./walk.ts";

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
