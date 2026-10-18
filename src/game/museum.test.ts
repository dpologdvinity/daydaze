import assert from "node:assert/strict";
import test from "node:test";
import { areaOf, isBlocked } from "./area.ts";
import { EXHIBITS, viewpoint } from "./museum.ts";
import { ROOMS } from "./rooms.ts";

test("every exhibit stands in the hall with a clear spot to look from", () => {
  const area = areaOf(ROOMS.museum);
  assert.equal(new Set(EXHIBITS.map((e) => e.kind)).size, EXHIBITS.length);
  for (const e of EXHIBITS) {
    assert.equal(isBlocked(area, e.at), true, e.title);
    assert.equal(isBlocked(area, viewpoint(e)), false, e.title);
    assert.ok(e.plaque.length > 60, e.title);
  }
  assert.equal(isBlocked(area, ROOMS.museum.spawn.position), false);
});
