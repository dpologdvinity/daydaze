// Streak check-ins pay a milestone's coins, cosmetic and Street XP together,
// once per day, so a reload or a second tab cannot repay it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultSave, type SaveV1 } from "../save.ts";
import { STREAK_REWARDS } from "../streak.ts";
import { applyCheckIn } from "./streakReward.ts";

// Days count from the epoch (dayOf); 0 means "never checked in".
const START = 20_000;

/** Checks in on n days in a row from START, returning the save after the last. */
function checkInDays(n: number): SaveV1 {
  let s = createDefaultSave("Mango");
  for (let i = 0; i < n; i++) s = applyCheckIn(s, START + i);
  return s;
}

test("a milestone credits its XP to the Street ladder with its coins", () => {
  const before = checkInDays(2);
  const after = applyCheckIn(before, START + 2);
  const day3 = STREAK_REWARDS.find((r) => r.day === 3);
  assert.ok(day3);
  assert.equal(after.streak.count, 3);
  assert.equal(
    after.progression.xp.street,
    before.progression.xp.street + day3.xp,
  );
  assert.ok(after.coins >= before.coins + day3.coins);
});

test("a second check-in on the same day pays nothing", () => {
  const once = checkInDays(3);
  const twice = applyCheckIn(once, START + 2);
  assert.equal(twice, once);
});

test("a day that is not a milestone grants no XP", () => {
  const before = checkInDays(3);
  const after = applyCheckIn(before, START + 3);
  assert.equal(after.streak.count, 4);
  assert.equal(after.progression.xp.street, before.progression.xp.street);
  assert.equal(after.coins, before.coins);
});

test("day 30 adds its cosmetic once, with its XP", () => {
  const s = checkInDays(30);
  const day30 = STREAK_REWARDS.find((r) => r.day === 30);
  assert.ok(day30?.item);
  assert.equal(s.wardrobe.filter((i) => i === day30.item).length, 1);
  const milestoneXp = STREAK_REWARDS.reduce((sum, r) => sum + r.xp, 0);
  assert.equal(s.progression.xp.street, milestoneXp);
});
