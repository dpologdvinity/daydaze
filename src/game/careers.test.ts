// Careers: which career a job counts for, rank from lifetime shifts, the raise
// a rank pays and the promotion a shift can earn.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAREERS,
  CAREER_DEFS,
  PROMOTION_BONUS,
  RANK_SHIFTS,
  careerOf,
  careerRank,
  careerShifts,
  promotionFor,
  raised,
} from "./careers.ts";
import { JOBS } from "./shifts.ts";

test("every shift job counts toward exactly one career", () => {
  for (const job of JOBS) {
    const owners = CAREERS.filter((c) =>
      CAREER_DEFS[c].jobs.some((j) => j === job),
    );
    assert.deepEqual(owners, [careerOf(job)]);
  }
});

test("every career has a name for each rank and a threshold for each", () => {
  for (const c of CAREERS)
    assert.equal(CAREER_DEFS[c].ranks.length, RANK_SHIFTS.length);
  assert.equal(RANK_SHIFTS[0], 0);
  for (let i = 1; i < RANK_SHIFTS.length; i++)
    assert.ok(RANK_SHIFTS[i] > RANK_SHIFTS[i - 1]);
});

test("career shifts add up the jobs of the career only", () => {
  const worked = { ramen: 2, "halo-halo": 3, barista: 9 };
  assert.equal(careerShifts(worked, "chef"), 5);
  assert.equal(careerShifts(worked, "zoo"), 0);
});

test("rank steps up exactly at each threshold", () => {
  RANK_SHIFTS.forEach((n, rank) => {
    assert.equal(careerRank({ feeding: n }, "zoo"), rank);
    if (n > 0) assert.equal(careerRank({ feeding: n - 1 }, "zoo"), rank - 1);
  });
  assert.equal(careerRank({ feeding: 99_999 }, "zoo"), RANK_SHIFTS.length - 1);
});

test("the raise grows with rank and rounds down", () => {
  assert.equal(raised(10, 0), 10);
  assert.equal(raised(10, 1), 11);
  assert.equal(raised(33, 2), 39);
  assert.equal(raised(0, 4), 0);
});

test("only the shift that reaches a new rank promotes, and pays a bonus", () => {
  const before = { ramen: RANK_SHIFTS[1] - 1 };
  const after = { ramen: RANK_SHIFTS[1] };
  const p = promotionFor(before, after, "ramen");
  assert.deepEqual(p, {
    career: "chef",
    rank: 1,
    name: CAREER_DEFS.chef.ranks[1],
    bonus: PROMOTION_BONUS,
  });
  assert.equal(
    promotionFor(after, { ramen: RANK_SHIFTS[1] + 1 }, "ramen"),
    null,
  );
  assert.equal(promotionFor(before, before, "ramen"), null);
});

test("a job's shift never promotes a different career", () => {
  const before = { ramen: RANK_SHIFTS[1] - 1, boba: 0 };
  assert.equal(promotionFor(before, { ...before, boba: 1 }, "boba"), null);
});
