import assert from "node:assert/strict";
import test from "node:test";
import {
  CHALLENGE_PAY,
  challengesFor,
  cleanChallenges,
  completeChallenge,
  dayOf,
  NO_CHALLENGES,
} from "./challenges.ts";

test("each day has three different games, the same for everyone", () => {
  for (let day = 20_000; day < 20_050; day++) {
    const list = challengesFor(day);
    assert.equal(new Set(list.map((c) => c.game)).size, 3);
    assert.deepEqual(list, challengesFor(day));
  }
  assert.notDeepEqual(challengesFor(20_000), challengesFor(20_001));
});

test("reaching a target pays once a day, and a new day starts afresh", () => {
  const day = dayOf(Date.UTC(2026, 9, 17));
  const [c] = challengesFor(day);
  const first = completeChallenge(NO_CHALLENGES, day, c.game, c.target);
  assert.equal(first.coins, CHALLENGE_PAY);
  assert.deepEqual(first.save.done, [c.game]);
  const again = completeChallenge(first.save, day, c.game, c.target);
  assert.equal(again.coins, 0);
  const tomorrow = completeChallenge(first.save, day + 1, c.game, c.target);
  assert.equal(tomorrow.save.day, day + 1);
  assert.ok(!tomorrow.save.done.includes(c.game) || tomorrow.coins > 0);
});

test("a score short of the target, or a game not on today's list, pays 0", () => {
  const day = 20_100;
  const list = challengesFor(day);
  const [c] = list;
  const short = c.game === "mini-golf" ? c.target + 1 : c.target - 1;
  assert.equal(completeChallenge(NO_CHALLENGES, day, c.game, short).coins, 0);
  const off = (["hoops", "penalties", "bowling", "skate"] as const).find(
    (g) => !list.some((x) => x.game === g),
  );
  if (off)
    assert.equal(completeChallenge(NO_CHALLENGES, day, off, 1e6).coins, 0);
});

test("stored challenges keep only known games", () => {
  assert.deepEqual(cleanChallenges({ day: 5, done: ["hoops", "moon", 3] }), {
    day: 5,
    done: ["hoops"],
  });
  assert.deepEqual(cleanChallenges({ day: "5", done: [] }), NO_CHALLENGES);
  assert.deepEqual(cleanChallenges(null), NO_CHALLENGES);
});
