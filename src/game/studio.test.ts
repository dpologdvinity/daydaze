import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, isBlocked } from "./area.ts";
import { ROOMS } from "./rooms.ts";
import { STATIONS, stationNear } from "./studio.ts";

test("every instrument is played from open floor, and found from there", () => {
  for (const [id, s] of Object.entries(STATIONS)) {
    assert.equal(isBlocked(areaOf(ROOMS["music-studio"]), s.player), false, id);
    assert.equal(stationNear(s.player), id);
  }
  assert.equal(stationNear([7, 5]), null);
});
