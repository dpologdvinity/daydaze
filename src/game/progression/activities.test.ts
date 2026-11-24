// Activity rewards: every scored game feeds a ladder, and replayed discoveries
// or scheduled event visits cannot replay their one-time rewards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIZE_GAMES, PRIZE_TABLES } from "../prizes.ts";
import { challengesFor, dayOf } from "../challenges.ts";
import { createDefaultSave, loadSave, serializeSave } from "../save.ts";
import { CLEAN_BONUS, PASSING_ORDERS, WAGE_PER_ORDER } from "../shifts.ts";
import { freshProgression, totalXp } from "./progression.ts";
import {
  GAME_LADDERS,
  applyPrize,
  finishPrize,
  finishShift,
  scorePrize,
  rewardSteal,
  rewardVisit,
  rewardLegacy,
  rewardXp,
  prizeXp,
} from "./activities.ts";
import { PROMOTION_BONUS, RANK_SHIFTS, raised } from "../careers.ts";

test("every scored activity has a ladder and grades increase XP", () => {
  for (const game of PRIZE_GAMES) assert.ok(GAME_LADDERS[game]);
  for (const [grade, expected] of [
    ["C", 25],
    ["B", 45],
    ["A", 70],
    ["S", 100],
  ] as const) {
    const s = rewardLegacy(createDefaultSave("Mango"), "bassline", grade);
    assert.equal(s.progression.xp.fame, expected);
  }
  assert.equal(
    rewardLegacy(createDefaultSave("Mango"), "last-call", "A").progression.xp
      .hustle,
    70,
  );
});

test("prizes combine grade, best, daily XP and coins atomically", () => {
  const now = Date.UTC(2026, 10, 19);
  const { game, target } = challengesFor(dayOf(now))[0];
  const before = createDefaultSave("Mango");
  const result = finishPrize(before, game, target, now);
  assert.ok(result);
  const { save, xp } = result;
  assert.equal(xp, 70 + 25 + 75);
  assert.equal(totalXp(save.progression), xp);
  assert.equal(save.progression.xp[GAME_LADDERS[game]], xp);
  assert.equal(before.bests[game], undefined);
  assert.equal(before.coins + 25 + 15 + 50, save.coins);
  const again = finishPrize(save, game, target, now);
  assert.ok(again);
  assert.equal(again.xp, 70);
  assert.equal(again.save.bests[game], target);
  assert.deepEqual(again.save.challenges.done, [game]);
});

test("lower-is-better race personal bests retain their scoring", () => {
  const s = createDefaultSave("Mango");
  const first = finishPrize(s, "speedway", 3, 0);
  assert.ok(first);
  const faster = finishPrize(first.save, "speedway", 1, 0);
  assert.ok(faster);
  assert.equal(faster.prize.best, true);
  assert.equal(faster.prize.grade, "S");
  assert.equal(faster.save.bests.speedway, 1);
  const worse = finishPrize(faster.save, "speedway", 2, 0);
  assert.ok(worse);
  assert.equal(worse.prize.best, false);
  assert.equal(worse.save.bests.speedway, 1);
  assert.equal(PRIZE_TABLES.speedway.lower, true);
});

test("a newly visited place pays once, including after save round-trip", () => {
  const first = rewardVisit(createDefaultSave("Mango"), "city", 0, false);
  assert.equal(first.progression.xp.street, 30);
  assert.deepEqual(first.visited, ["city"]);
  const loaded = loadSave(serializeSave(first), "Mango");
  const again = rewardVisit(loaded, "city", 0, false);
  assert.equal(again, loaded);
  assert.equal(rewardVisit(again, "green-haze", 0, false), again);
  assert.equal(
    rewardVisit(again, "green-haze", 0, true).progression.xp.street,
    60,
  );
});

test("event attendance pays once per real occurrence across venues and reloads", () => {
  const now = Date.UTC(2026, 10, 20, 23, 15); // Friday Y2K night
  const s = createDefaultSave("Mango");
  s.visited = ["pulse", "sugar-rush"];
  const first = rewardVisit(s, "pulse", now, false);
  assert.ok(first.progression.xp.fame >= 75);
  const again = rewardVisit(
    loadSave(serializeSave(first), "Mango"),
    "sugar-rush",
    now + 60_000,
    false,
  );
  assert.equal(again.progression.xp.fame, first.progression.xp.fame);
  const next = rewardVisit(again, "pulse", now + 7 * 86400000, false);
  assert.ok(next.progression.xp.fame > first.progression.xp.fame);
});

test("old saves gain fresh progress without losing existing play", () => {
  const s = loadSave(
    JSON.stringify({
      name: "Mango",
      coins: 1234,
      bests: { hoops: 25 },
      visited: ["city"],
    }),
    "Guest",
  );
  assert.deepEqual(s.progression, freshProgression());
  assert.equal(s.coins, 1234);
  assert.equal(s.bests.hoops, 25);
  assert.equal(rewardVisit(s, "city", 0, false), s);
  const rank = rewardXp(s, "street", 800);
  assert.equal(rank.coins, 1534);
  assert.equal(rank.progression.xp.street, 800);
});

test("invalid scores cannot poison saved progress or bests", () => {
  const s = createDefaultSave("Mango");
  for (const score of [NaN, Infinity, -Infinity, 1e8])
    assert.equal(finishPrize(s, "hoops", score, 0), null);
});

test("a lift pays Street XP once per item, so re-stealing can't farm it", () => {
  const once = rewardSteal(createDefaultSave("Mango"), "tee-pink", "thrift");
  assert.equal(once.progression.xp.street, 75);
  assert.ok(once.wardrobe.includes("tee-pink"));
  const twice = rewardSteal(once, "tee-pink", "thrift");
  assert.equal(twice.progression.xp.street, 75);
});

test("a scored prize commits exactly what its card shows, on a newer save", () => {
  const graded = createDefaultSave("Mango");
  const result = scorePrize(graded, "hoops", 30, 0);
  assert.ok(result);
  // a discovery lands between grading and committing
  const newer = rewardVisit(graded, "city", 0, false);
  const saved = applyPrize(newer, "hoops", result);
  assert.equal(
    totalXp(saved.progression),
    totalXp(newer.progression) + result.xp,
  );
  assert.equal(saved.coins, newer.coins + result.prize.coins + result.daily);
  assert.ok(saved.visited.includes("city"));
});

test("a room outside the album pays no first-visit XP, however often", () => {
  let s = createDefaultSave("Mango");
  for (let i = 0; i < 5; i++) s = rewardVisit(s, "jail", -1, false);
  assert.equal(s.progression.xp.street, 0);
  assert.ok(!s.visited.includes("jail"));
});

test("prizeXp is the grade's XP plus 25 for a personal best", () => {
  assert.equal(prizeXp("C", false), 25);
  assert.equal(prizeXp("S", false), 100);
  assert.equal(prizeXp("A", true), 95);
});

test("a finished shift pays the wage and Hustle XP into the save at once", () => {
  const start = createDefaultSave("Mango");
  const r = finishShift(
    start,
    "barista",
    { right: 8, tips: 6 },
    Date.UTC(2026, 10, 20),
  );
  assert.equal(r.coins, 8 * WAGE_PER_ORDER + 6 + CLEAN_BONUS);
  assert.equal(r.save.coins, start.coins + r.coins);
  assert.equal(r.save.progression.xp.hustle, r.xp);
  assert.equal(r.save.shifts.worked.barista, 1);
  assert.equal(start.shifts.today, 0);
});

test("a result no station can produce changes nothing", () => {
  const start = createDefaultSave("Mango");
  const r = finishShift(start, "boba", { right: 99, tips: 0 }, 0);
  assert.equal(r.save, start);
  assert.equal(r.coins, 0);
});

test("a shift at a higher rank pays the raise, and the promoting shift pays the bonus", () => {
  const now = Date.UTC(2026, 10, 20);
  const result = { right: 8, tips: 6 };
  const base = 8 * WAGE_PER_ORDER + 6 + CLEAN_BONUS;
  const seed = (n: number) => {
    const s = createDefaultSave("Mango");
    return { ...s, shifts: { ...s.shifts, worked: { barista: n } } };
  };
  // rank 0 shift that reaches rank 1: bonus, but no raise yet
  const up = finishShift(seed(RANK_SHIFTS[1] - 1), "barista", result, now);
  assert.equal(up.promotion?.rank, 1);
  assert.equal(up.coins, base + PROMOTION_BONUS);
  assert.equal(up.save.coins, 100 + up.coins);
  // next shift at rank 1: raised wage, no promotion
  const next = finishShift(seed(RANK_SHIFTS[1]), "barista", result, now);
  assert.equal(next.promotion, null);
  assert.equal(next.coins, raised(base, 1));
  // the boba counter counts toward the same Cafe career
  const boba = finishShift(seed(RANK_SHIFTS[1]), "boba", result, now);
  assert.equal(boba.coins, raised(base, 1));
});

test("a shift with fewer than PASSING_ORDERS does not trigger a promotion or bonus", () => {
  const now = Date.UTC(2026, 10, 20);
  const start = {
    ...createDefaultSave("Mango"),
    shifts: { day: 0, today: 0, worked: { barista: RANK_SHIFTS[1] - 1 } },
  };
  const r = finishShift(
    start,
    "barista",
    { right: PASSING_ORDERS - 1, tips: 2 },
    now,
  );
  assert.equal(r.promotion, null);
  assert.equal(r.coins, (PASSING_ORDERS - 1) * WAGE_PER_ORDER + 2);
  assert.equal(r.save.coins, start.coins + r.coins);
  assert.equal(r.save.shifts.worked.barista, RANK_SHIFTS[1] - 1);
});
