import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStation, STATIONS } from "./carRadio.ts";

test("the radio button runs off, through every station, and back to off", () => {
  let station = nextStation(null);
  const heard = [station];
  while (station !== null) {
    station = nextStation(station);
    heard.push(station);
  }
  assert.deepEqual(heard, [...STATIONS.map((s) => s.track), null]);
  assert.ok(STATIONS.length >= 3);
});
