// The club queues are standing people on the forecourts, facing their doors.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILDINGS } from "./layout.ts";
import { QUEUE_LOOKS, QUEUE_SPOTS } from "./queues.ts";

test("every queued club has nine people, with more than one look", () => {
  const clubs = BUILDINGS.filter((b) => b.queue).length;
  assert.ok(clubs > 0);
  assert.equal(QUEUE_SPOTS.length, clubs * 9);
  assert.ok(new Set(QUEUE_SPOTS.map((s) => s.look)).size >= 4);
  for (const s of QUEUE_SPOTS) assert.ok(QUEUE_LOOKS.includes(s.look));
});

test("queued people face their club's wall, away from the avenue's axis", () => {
  for (const s of QUEUE_SPOTS) {
    // forward is (sin yaw, cos yaw); the wall is farther out than the forecourt
    const dz = Math.cos(s.yaw);
    assert.ok(Math.abs(s.z) > 10, "on a forecourt");
    assert.ok(dz * s.z > 0, "facing the building's wall");
  }
});
