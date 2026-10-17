import assert from "node:assert/strict";
import test from "node:test";
import { isBlocked } from "../area.ts";
import { CITY_AREA } from "./layout.ts";
import { VENUE_PLACES } from "./places.ts";

test("the map's directory lists each venue once, landing on open street", () => {
  assert.ok(VENUE_PLACES.length > 20);
  assert.equal(
    new Set(VENUE_PLACES.map((p) => p.room)).size,
    VENUE_PLACES.length,
  );
  for (const p of VENUE_PLACES)
    assert.equal(isBlocked(CITY_AREA, p.spawn.position), false, p.room);
  for (const room of ["marina", "courtside", "mermaid-cove", "skate-diner"])
    assert.ok(
      VENUE_PLACES.some((p) => p.room === room),
      room,
    );
});
