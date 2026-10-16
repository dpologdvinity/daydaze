import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToArea, isBlocked } from "../area.ts";
import { neighborhoodAt } from "./cells.ts";
import { CITY_AREA } from "./layout.ts";
import { CITY_PLACES } from "./places.ts";

test("every neighbourhood has one fast-travel spot, on open ground inside it", () => {
  assert.equal(new Set(CITY_PLACES.map((p) => p.id)).size, CITY_PLACES.length);
  for (const place of CITY_PLACES) {
    const at = place.spawn.position;
    assert.equal(neighborhoodAt(at), place.id, place.id);
    assert.deepEqual(clampToArea(CITY_AREA, at), at, `${place.id} walkable`);
    assert.equal(isBlocked(CITY_AREA, at), false, `${place.id} blocked`);
  }
});
