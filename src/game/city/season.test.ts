// Seasonal dates follow the player's local calendar, including overlapping events.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dressings, parseDateFlag, season } from "./season.ts";

const date = (month: number, day: number, year = 2026) =>
  new Date(year, month - 1, day, 12);

test("seasons and overlapping dressings respect their boundaries", () => {
  assert.equal(season(date(9, 21)), "summer");
  assert.equal(season(date(9, 22)), "autumn");
  assert.deepEqual(dressings(date(10, 15)), ["autumn", "halloween"]);
  assert.deepEqual(dressings(date(11, 1)), ["autumn"]);
  assert.deepEqual(dressings(date(12, 1)), ["winter-holidays"]);
  assert.deepEqual(dressings(date(1, 6, 2027)), ["winter-holidays"]);
  assert.deepEqual(dressings(date(1, 7, 2027)), []);
  assert.deepEqual(dressings(date(6, 1)), ["summer", "pride"]);
  assert.deepEqual(dressings(date(8, 31)), ["summer"]);
  assert.deepEqual(dressings(date(9, 1)), []);
});

test("Lunar New Year covers the first fifteen days of the lunar year", () => {
  assert.ok(dressings(date(2, 17)).includes("lunar-new-year"));
  assert.ok(dressings(date(3, 3)).includes("lunar-new-year"));
  assert.ok(!dressings(date(3, 4)).includes("lunar-new-year"));
  assert.ok(dressings(date(1, 29, 2025)).includes("lunar-new-year"));
});

test("date preview rejects invalid dates and uses local calendar fields", () => {
  assert.equal(parseDateFlag("?date=2026-02-30"), null);
  assert.equal(parseDateFlag("?date=2026-2-01"), null);
  assert.equal(parseDateFlag("?date=2026-12-20")?.getDate(), 20);
});
