import assert from "node:assert/strict";
import { test } from "node:test";
import { areaOf, isBlocked } from "./area.ts";
import { CHAT_RING, CHAT_SPOTS } from "./chatSpots.ts";
import { isRoomId, ROOMS } from "./rooms.ts";
import { seatsIn } from "./seats.ts";
import { pointInPolygon } from "./walk.ts";

test("every venue huddle stands on open floor, clear of seats and the way in", () => {
  let spots = 0;
  for (const [id, list] of Object.entries(CHAT_SPOTS)) {
    assert.ok(isRoomId(id), id);
    const room = ROOMS[id];
    const area = areaOf(room);
    for (const spot of list ?? []) {
      spots++;
      const r = CHAT_RING[spot.size];
      // the middle and every place a person stands
      const stands = [
        spot.at,
        ...Array.from({ length: spot.size }, (_, m): [number, number] => {
          const a = (m / spot.size) * Math.PI * 2;
          return [spot.at[0] + Math.sin(a) * r, spot.at[1] + Math.cos(a) * r];
        }),
      ];
      for (const p of stands) {
        assert.ok(pointInPolygon(room.walkable, p), `${id} ${p} off the floor`);
        assert.equal(isBlocked(area, p), false, `${id} ${p} blocked`);
      }
      // not on a seat's approach, and not on the spawn
      for (const s of seatsIn(id))
        assert.ok(
          Math.hypot(s.approach[0] - spot.at[0], s.approach[1] - spot.at[1]) >
            r + 0.6,
          `${id} ${s.id}`,
        );
      assert.ok(
        Math.hypot(
          room.spawn.position[0] - spot.at[0],
          room.spawn.position[1] - spot.at[1],
        ) >
          r + 1.5,
        `${id} spawn`,
      );
    }
  }
  assert.ok(spots >= 2);
});
