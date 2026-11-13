import { test } from "node:test";
import assert from "node:assert/strict";
import { isRoomId, ROOMS } from "./rooms.ts";
import { clipOf } from "./dance/clips.ts";
import { SEATS, homeSeats, seatsIn } from "./seats.ts";
import { pointInPolygon } from "./walk.ts";
import { DINER_SEATS as KAMAYAN_DINERS } from "./kamayanHall.ts";
import { DINER_SEATS as GALLERIA_DINERS } from "./galleria.ts";
import { areaOf, isBlocked } from "./area.ts";

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

test("seats face their table or bar and stand half a meter in front", () => {
  for (const s of SEATS) {
    const d = Math.hypot(s.approach[0] - s.at[0], s.approach[1] - s.at[1]);
    // loungers are walked up to from the side, clear of their frame
    if (!s.lie) assert.ok(Math.abs(d - 0.5) < 1e-9, s.id);
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

test("every seat in every room is walked up to from open floor", () => {
  for (const id of Object.keys(ROOMS)) {
    if (!isRoomId(id) || id === "apartment") continue;
    const area = areaOf(ROOMS[id]);
    for (const s of seatsIn(id))
      assert.equal(isBlocked(area, s.approach), false, `${s.id} approach`);
  }
});

test("an office chair by a desk faces it and types; a lone one just sits", () => {
  const [at] = homeSeats([
    { id: "desk", cell: [2, 0], rotation: 0 },
    { id: "office-chair", cell: [2, 1], rotation: 0 },
  ]);
  assert.ok(at);
  assert.equal(at.hold, "seat-typing");
  // the desk is the row above (smaller z): she faces -z. The desk crowds the
  // front, so she is walked up to from a side: never behind the chair, never
  // standing at the desk (its middle is at -1, -2.5)
  assert.ok(Math.abs(Math.abs(at.yaw) - Math.PI) < 0.7);
  const toward =
    (at.approach[0] - at.at[0]) * Math.sin(at.yaw) +
    (at.approach[1] - at.at[1]) * Math.cos(at.yaw);
  assert.ok(Math.abs(toward) < 1e-9, "level with the chair, beside it");
  assert.ok(Math.hypot(at.approach[0] + 1, at.approach[1] + 2.5) > 1.2);
  const [alone] = homeSeats([
    { id: "office-chair", cell: [5, 4], rotation: 0 },
  ]);
  assert.ok(alone);
  assert.equal(alone.hold, undefined);
});

test("every seat's own hold is a baked held pose or seated loop", () => {
  const holds = SEATS.filter((s) => s.hold);
  // the cafes' tables
  assert.ok(holds.length >= 20);
  for (const s of holds) {
    const kind = clipOf(s.hold)?.kind;
    assert.ok(kind === "sit" || kind === "seat", `${s.id}: ${s.hold}`);
  }
});

test("no seat is walked up to from behind it, or from inside another seat", () => {
  const behind: string[] = [];
  for (const s of SEATS) {
    if (s.lie) continue;
    const toward =
      (s.approach[0] - s.at[0]) * Math.sin(s.yaw) +
      (s.approach[1] - s.at[1]) * Math.cos(s.yaw);
    if (toward < -1e-9) behind.push(s.id);
    for (const o of SEATS)
      if (o !== s && o.room === s.room)
        assert.ok(
          Math.hypot(s.approach[0] - o.at[0], s.approach[1] - o.at[1]) >= 0.35,
          `${s.id} approach stands in ${o.id}`,
        );
  }
  // only backless seats keep a way in from behind, because no floor beside or
  // in front of them is a clear walk: the Velvet Room's bar stools (the floor
  // ends at them), the hot tub, and benches walked up to across their bays
  assert.deepEqual(
    [...new Set(behind.map((id) => id.replace(/-\d.*$/, "")))].sort(),
    [
      "bowling-bench",
      "drive-in-bench",
      "driving-range-bench",
      "roof-tub",
      "velvet-stool",
    ],
  );
});
