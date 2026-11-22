// Hunger and thirst are gentle needs for every player: they build slowly with
// play, weed's munchies and dry mouth speed them up (adults only), food and
// nonalcoholic drinks relieve the matching need, and a full need only nudges
// the walk. Nothing here ever blocks play.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshNeeds,
  needLabel,
  needPace,
  satisfyNeed,
  stepNeeds,
} from "./needs.ts";

const close = (a: number, b: number): void =>
  assert.ok(Math.abs(a - b) < 1e-12, `${a} is not ${b}`);

test("everyone, sober, builds hunger and thirst slowly, thirst faster", () => {
  const later = stepNeeds(freshNeeds(), 0, 600, false);
  close(later.hunger, 1 / 3);
  close(later.thirst, 1 / 2);
  assert.ok(later.thirst > later.hunger);
});

test("weed adds munchies and dry mouth on top, for adults only", () => {
  const base = stepNeeds(freshNeeds(), 0, 30, true);
  const high = stepNeeds(freshNeeds(), 1, 30, true);
  close(high.hunger - base.hunger, 30 / 120);
  close(high.thirst - base.thirst, 30 / 90);
  // below FELT the weed adds nothing; a 13+ player never gets the boost
  assert.deepEqual(stepNeeds(freshNeeds(), 0.1, 30, true), base);
  assert.deepEqual(stepNeeds(freshNeeds(), 1, 30, false), base);
});

test("needs are capped at 1 and never fall on their own", () => {
  assert.deepEqual(stepNeeds(freshNeeds(), 1, 1e6, true), {
    hunger: 1,
    thirst: 1,
  });
  const some = { hunger: 0.4, thirst: 0.4 };
  const next = stepNeeds(some, 0, 30, true);
  assert.ok(next.hunger > 0.4 && next.thirst > 0.4);
});

test("invalid elapsed time is inert and invalid levels add no weed", () => {
  const needs = { hunger: 0.5, thirst: 0.5 };
  for (const dt of [-1, 0, NaN, Infinity])
    assert.deepEqual(stepNeeds(needs, 1, dt, true), needs);
  for (const level of [NaN, Infinity, -1])
    assert.deepEqual(
      stepNeeds(freshNeeds(), level, 10, true),
      stepNeeds(freshNeeds(), 0, 10, true),
    );
});

test("food and soft drinks relieve the matching need without crossing zero", () => {
  const needs = { hunger: 1, thirst: 1 };
  assert.deepEqual(satisfyNeed(needs, "food"), { hunger: 0.35, thirst: 1 });
  close(satisfyNeed(needs, "drink").thirst, 0.2);
  assert.deepEqual(satisfyNeed(freshNeeds(), "food"), freshNeeds());
  assert.deepEqual(satisfyNeed(freshNeeds(), "drink"), freshNeeds());
  assert.deepEqual(needs, { hunger: 1, thirst: 1 });
});

test("the walk slows only a little, and only once a need is high", () => {
  assert.equal(needPace(freshNeeds()), 1);
  assert.equal(needPace({ hunger: 0.6, thirst: 0.6 }), 1);
  assert.equal(needPace({ hunger: 1, thirst: 0 }), 0.9);
  assert.equal(needPace({ hunger: 0, thirst: 1 }), 0.9);
  assert.equal(needPace({ hunger: 1, thirst: 1 }), 0.9);
  const mid = needPace({ hunger: 0.8, thirst: 0 });
  assert.ok(mid < 1 && mid > 0.9);
  assert.equal(needPace({ hunger: NaN, thirst: Infinity }), 1);
});

test("the HUD label stays quiet until a need is worth mentioning", () => {
  assert.equal(needLabel(freshNeeds(), false), null);
  assert.equal(needLabel({ hunger: 0.4, thirst: 0.4 }, false), null);
  assert.equal(needLabel({ hunger: 0.7, thirst: 0.1 }, false), "Hungry");
  assert.equal(needLabel({ hunger: 0.1, thirst: 0.7 }, false), "Thirsty");
  assert.equal(
    needLabel({ hunger: 0.7, thirst: 0.7 }, false),
    "Hungry and thirsty",
  );
  // weed speaks up sooner, in its own words
  assert.equal(needLabel({ hunger: 0.3, thirst: 0.1 }, true), "The munchies");
  assert.equal(needLabel({ hunger: 0.1, thirst: 0.3 }, true), "Cotton mouth");
  assert.equal(needLabel({ hunger: 0.1, thirst: 0.1 }, true), null);
});
