// Short shifts: the wage rules (per order, tips, clean bonus, slow hours), the
// job list, the save record and its validation.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLEAN_BONUS,
  FULL_PAY_SHIFTS,
  NO_SHIFTS,
  PASSING_ORDERS,
  WAGE_PER_ORDER,
  XP_PER_ORDER,
  cleanShifts,
  isJob,
  settleShift,
} from "./shifts.ts";
import { MAX_TIP, TICKETS } from "./orders.ts";

const day = 20_000;

test("a shift pays per right order and passes tips through", () => {
  const r = settleShift(NO_SHIFTS, "barista", { right: 5, tips: 7 }, day);
  assert.equal(r.coins, 5 * WAGE_PER_ORDER + 7);
  assert.equal(r.xp, 5 * XP_PER_ORDER);
  assert.equal(r.clean, false);
  assert.equal(r.slow, false);
});

test("a shift with every ticket right adds the clean bonus", () => {
  const r = settleShift(NO_SHIFTS, "boba", { right: TICKETS, tips: 0 }, day);
  assert.equal(r.coins, TICKETS * WAGE_PER_ORDER + CLEAN_BONUS);
  assert.equal(r.clean, true);
});

test("a shift counts toward the day and the job", () => {
  const r = settleShift(
    NO_SHIFTS,
    "ramen",
    { right: PASSING_ORDERS, tips: 0 },
    day,
  );
  assert.deepEqual(r.shifts, { day, today: 1, worked: { ramen: 1 } });
});

test("a shift with fewer than PASSING_ORDERS right pays wages but does not count toward worked", () => {
  const r = settleShift(
    NO_SHIFTS,
    "ramen",
    { right: PASSING_ORDERS - 1, tips: 2 },
    day,
  );
  assert.equal(r.coins, (PASSING_ORDERS - 1) * WAGE_PER_ORDER + 2);
  assert.equal(r.xp, (PASSING_ORDERS - 1) * XP_PER_ORDER);
  assert.deepEqual(r.shifts, { day, today: 1, worked: {} });
});

test("slow hours: shifts past the daily limit pay half, rounded down", () => {
  let s = NO_SHIFTS;
  for (let i = 0; i < FULL_PAY_SHIFTS; i++)
    s = settleShift(
      s,
      "barista",
      { right: PASSING_ORDERS, tips: 0 },
      day,
    ).shifts;
  const slow = settleShift(
    s,
    "barista",
    { right: PASSING_ORDERS, tips: 1 },
    day,
  );
  assert.equal(
    slow.coins,
    Math.floor((PASSING_ORDERS * WAGE_PER_ORDER + 1) / 2),
  );
  assert.equal(slow.xp, Math.floor((PASSING_ORDERS * XP_PER_ORDER) / 2));
  assert.equal(slow.slow, true);
  assert.equal(slow.shifts.worked.barista, FULL_PAY_SHIFTS + 1);
});

test("a new day starts the count over but keeps lifetime shifts", () => {
  let s = NO_SHIFTS;
  for (let i = 0; i < FULL_PAY_SHIFTS + 1; i++)
    s = settleShift(
      s,
      "feeding",
      { right: PASSING_ORDERS, tips: 0 },
      day,
    ).shifts;
  const next = settleShift(
    s,
    "feeding",
    { right: PASSING_ORDERS, tips: 0 },
    day + 1,
  );
  assert.equal(next.coins, PASSING_ORDERS * WAGE_PER_ORDER);
  assert.equal(next.shifts.today, 1);
  assert.equal(next.shifts.worked.feeding, FULL_PAY_SHIFTS + 2);
});

test("a clock that went backwards does not refill the day", () => {
  let s = NO_SHIFTS;
  for (let i = 0; i < FULL_PAY_SHIFTS; i++)
    s = settleShift(s, "barista", { right: 2, tips: 0 }, day).shifts;
  const r = settleShift(s, "barista", { right: 2, tips: 0 }, day - 1);
  assert.equal(r.coins, Math.floor((2 * WAGE_PER_ORDER) / 2));
});

test("nonsense results pay nothing", () => {
  for (const bad of [
    { right: -1, tips: 0 },
    { right: 1.5, tips: 0 },
    { right: TICKETS + 1, tips: 0 },
    { right: 1, tips: -3 },
    { right: 1, tips: TICKETS * MAX_TIP + 1 },
    { right: NaN, tips: 0 },
  ]) {
    const r = settleShift(NO_SHIFTS, "barista", bad, day);
    assert.equal(r.coins, 0);
    assert.equal(r.shifts, NO_SHIFTS);
  }
});

test("only workplace jobs are jobs", () => {
  assert.equal(isJob("barista"), true);
  assert.equal(isJob("cook-off"), false);
  assert.equal(isJob(3), false);
});

test("a saved record is cleaned field by field", () => {
  assert.deepEqual(cleanShifts(undefined), NO_SHIFTS);
  assert.deepEqual(cleanShifts("x"), NO_SHIFTS);
  const ok = cleanShifts({
    day: 5,
    today: 2,
    worked: { barista: 3, bogus: 9, boba: -1, ramen: 1.5, feeding: 4 },
  });
  assert.deepEqual(ok, {
    day: 5,
    today: 2,
    worked: { barista: 3, feeding: 4 },
  });
  assert.deepEqual(cleanShifts({ day: -1, today: "a", worked: [] }), NO_SHIFTS);
});
