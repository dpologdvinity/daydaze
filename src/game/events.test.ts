import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLUB_NIGHTS,
  eventSituation,
  formatWait,
  eventTrack,
  nightOn,
  nightsAt,
  schedule,
} from "./events.ts";

const at = (iso: string) => Date.parse(iso);
const night = (id: string) => CLUB_NIGHTS.find((n) => n.id === id)!;

test("Y2K night runs Friday 23:00 to Saturday 05:00 UTC", () => {
  const y2k = night("y2k-night");
  assert.equal(nightOn(y2k, at("2026-10-23T22:59:00Z")), false);
  assert.equal(nightOn(y2k, at("2026-10-23T23:00:00Z")), true);
  assert.equal(nightOn(y2k, at("2026-10-24T04:59:00Z")), true);
  assert.equal(nightOn(y2k, at("2026-10-24T05:00:00Z")), false);
  // a Thursday at the same hour is chiptune's, not Y2K's
  assert.equal(nightOn(y2k, at("2026-10-22T23:30:00Z")), false);
});

test("Latin night comes twice a week, Wednesday and Saturday", () => {
  const latin = night("latin-night");
  assert.equal(nightOn(latin, at("2026-10-21T23:30:00Z")), true);
  assert.equal(nightOn(latin, at("2026-10-24T23:30:00Z")), true);
  assert.equal(nightOn(latin, at("2026-10-25T23:30:00Z")), false);
});

test("no two nights share a club at the same time", () => {
  for (let h = 0; h < 7 * 24; h++) {
    const t = at("2026-10-18T00:30:00Z") + h * 3_600_000;
    const seen = new Set<string>();
    for (const n of CLUB_NIGHTS)
      if (nightOn(n, t))
        for (const c of n.clubs) {
          assert.ok(!seen.has(c), `${c} double-booked at hour ${h}`);
          seen.add(c);
        }
  }
});

test("the schedule counts down to each night, and down to its end once on", () => {
  // Thursday 21:00 UTC: chiptune in 2 h; Y2K a day and 2 h out
  const rows = schedule(at("2026-10-22T21:00:00Z"));
  const chip = rows.find((r) => r.id === "chiptune-night")!;
  assert.deepEqual([chip.on, chip.inMs], [false, 2 * 3_600_000]);
  const y2k = rows.find((r) => r.id === "y2k-night")!;
  assert.equal(y2k.inMs, 26 * 3_600_000);
  // soonest first
  assert.equal(rows[0]?.id, "chiptune-night");
  // during it: on, with the time left
  const on = schedule(at("2026-10-23T01:00:00Z")).find(
    (r) => r.id === "chiptune-night",
  )!;
  assert.deepEqual([on.on, on.inMs, on.leftMs], [true, 0, 4 * 3_600_000]);
});

test("a club on its night plays the night's music and NPCs talk about it", () => {
  const friday = at("2026-10-23T23:30:00Z");
  assert.deepEqual(
    nightsAt("pulse", friday).map((n) => n.id),
    ["y2k-night"],
  );
  assert.equal(eventTrack("pulse", friday), "sugar-rush-pop");
  assert.equal(eventSituation("pulse", friday, false), "event-y2k-night");
  // a room that isn't in on it: nothing
  assert.equal(eventTrack("bowling", friday), null);
  assert.equal(eventSituation("bowling", friday, false), null);
  // Pride night (its own quick cycle) wins in a Pride club
  assert.equal(eventSituation("pulse", friday, true), "event-pride-night");
});

test("waits read as days and hours, hours and minutes, or minutes", () => {
  const m = 60_000;
  assert.equal(formatWait(2 * 1440 * m + 3 * 60 * m + 40 * m), "2d 3h");
  assert.equal(formatWait(3 * 60 * m + 12 * m), "3h 12m");
  assert.equal(formatWait(12 * m + 30_000), "13m");
  assert.equal(formatWait(10_000), "1m");
  assert.equal(formatWait(0), "now");
});
