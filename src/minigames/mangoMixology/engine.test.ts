import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GARNISHES,
  GLASSES,
  INGREDIENTS,
  MAX_POURS,
  RECIPES,
  ROUND_ORDERS,
  generateOrders,
  gradeFor,
  ingredientsMatch,
  judgeDrink,
  maxTips,
  meterPosition,
  mixQualityAt,
  newRound,
  pour,
  roundResult,
  serve,
  streakOf,
  tipFor,
  type Drink,
  type Recipe,
} from "./engine.ts";

const recipe = (id: string): Recipe => {
  const found = RECIPES.find((r) => r.id === id);
  if (!found) throw new Error(`no recipe ${id}`);
  return found;
};

const exact = (r: Recipe): Drink => ({
  ingredients: [...r.ingredients],
  glass: r.glass,
  garnish: r.garnish,
});

/** Deterministic random that walks a fixed list of values. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test("the menu has every drink in a regular and a zero-proof version", () => {
  for (const name of [
    "Mango margarita",
    "Mango mojito",
    "Passionfruit martini",
    "Pink lemonade spritz",
  ]) {
    const versions = RECIPES.filter((r) =>
      r.name.toLowerCase().endsWith(name.toLowerCase()),
    );
    assert.equal(versions.length, 2, name);
    assert.deepEqual(
      versions.map((r) => r.zeroProof),
      [false, true],
    );
  }
});

test("recipes only use known bottles, glasses and garnishes and fit the glass", () => {
  const ids = new Set(INGREDIENTS.map((i) => i.id));
  for (const r of RECIPES) {
    assert.ok(
      r.ingredients.every((i) => ids.has(i)),
      r.id,
    );
    assert.ok(r.ingredients.length <= MAX_POURS, r.id);
    assert.ok(
      GLASSES.some((g) => g.id === r.glass),
      r.id,
    );
    assert.ok(
      GARNISHES.some((g) => g.id === r.garnish),
      r.id,
    );
  }
});

test("zero-proof drinks carry no spirits and wear a mango slice", () => {
  const spirits = new Set(INGREDIENTS.filter((i) => i.spirit).map((i) => i.id));
  for (const r of RECIPES.filter((r) => r.zeroProof)) {
    assert.ok(!r.ingredients.some((i) => spirits.has(i)), r.id);
    assert.equal(r.garnish, "mango_slice");
  }
});

test("ingredients match as a multiset, in any pour order", () => {
  const margarita = recipe("mango_margarita");
  assert.ok(ingredientsMatch(margarita, [...margarita.ingredients].reverse()));
  assert.ok(!ingredientsMatch(margarita, margarita.ingredients.slice(1)));
  assert.ok(!ingredientsMatch(margarita, [...margarita.ingredients, "soda"]));
});

test("pouring stops when the glass is full", () => {
  let drink: Drink = { ingredients: [], glass: null, garnish: null };
  for (let i = 0; i < MAX_POURS + 3; i++) drink = pour(drink, "soda");
  assert.equal(drink.ingredients.length, MAX_POURS);
});

test("orders come from the injected random and never repeat back to back", () => {
  const orders = generateOrders(ROUND_ORDERS, sequence(0, 0, 0.5, 0.99));
  assert.equal(orders.length, ROUND_ORDERS);
  assert.deepEqual(
    orders.map((o) => o.id),
    [0, 1, 2, 3, 4],
  );
  for (let i = 1; i < orders.length; i++) {
    assert.notEqual(orders[i].recipe.id, orders[i - 1].recipe.id);
    assert.notEqual(orders[i].guest.name, orders[i - 1].guest.name);
  }
  assert.deepEqual(
    generateOrders(3, sequence(0.3, 0.7)),
    generateOrders(3, sequence(0.3, 0.7)),
  );
  assert.deepEqual(generateOrders(0, Math.random), []);
});

test("the meter sweeps across and back every 1.6 seconds", () => {
  assert.equal(meterPosition(0), 0);
  assert.equal(meterPosition(400), 0.5);
  assert.equal(meterPosition(800), 1);
  assert.equal(meterPosition(1200), 0.5);
  assert.equal(meterPosition(1600), 0);
  assert.equal(meterPosition(-5), 0);
});

test("mix quality depends on how close the stop is to the sweet spot", () => {
  assert.equal(mixQualityAt(0.5), "perfect");
  assert.equal(mixQualityAt(0.58), "perfect");
  assert.equal(mixQualityAt(0.42), "perfect");
  assert.equal(mixQualityAt(0.65), "good");
  assert.equal(mixQualityAt(0.3), "good");
  assert.equal(mixQualityAt(0.1), "sloppy");
  assert.equal(mixQualityAt(1), "sloppy");
});

test("a perfect, quick drink earns every part of the tip", () => {
  const r = recipe("mango_margarita");
  const verdict = judgeDrink(r, exact(r), "perfect", 9_000);
  assert.deepEqual(verdict, {
    ingredients: true,
    glass: true,
    garnish: true,
    mix: "perfect",
    speed: "quick",
    perfect: true,
  });
  assert.deepEqual(tipFor(r, verdict, 0), {
    pour: r.baseTip,
    glass: 2,
    garnish: 2,
    mix: 3,
    speed: 3,
    streak: 0,
    total: r.baseTip + 10,
  });
});

test("a wrong garnish loses only the garnish tip and breaks perfection", () => {
  const r = recipe("mango_mojito");
  const verdict = judgeDrink(
    r,
    { ...exact(r), garnish: "lime_wheel" },
    "perfect",
    9_000,
  );
  assert.equal(verdict.garnish, false);
  assert.equal(verdict.perfect, false);
  const tip = tipFor(r, verdict, 0);
  assert.equal(tip.garnish, 0);
  assert.equal(tip.total, r.baseTip + 8);
});

test("a wrong glass, a sloppy mix and a slow serve each cost their part", () => {
  const r = recipe("passionfruit_martini");
  const verdict = judgeDrink(
    r,
    { ...exact(r), glass: "rocks" },
    "sloppy",
    40_000,
  );
  assert.equal(verdict.speed, "slow");
  assert.equal(tipFor(r, verdict, 0).total, r.baseTip + 2);
  const steady = judgeDrink(r, exact(r), "good", 20_000);
  assert.equal(steady.speed, "steady");
  assert.equal(tipFor(r, steady, 0).total, r.baseTip + 2 + 2 + 1 + 1);
});

test("wrong ingredients send the drink back with no tip at all", () => {
  const r = recipe("pink_lemonade_spritz");
  const verdict = judgeDrink(
    r,
    { ...exact(r), ingredients: ["soda"] },
    "perfect",
    1_000,
  );
  assert.equal(verdict.ingredients, false);
  assert.equal(tipFor(r, verdict, 3).total, 0);
});

test("a perfect streak adds a growing bonus, capped at 3", () => {
  const r = recipe("mango_margarita");
  const verdict = judgeDrink(r, exact(r), "perfect", 1_000);
  assert.deepEqual(
    [0, 1, 2, 3, 7].map((s) => tipFor(r, verdict, s).streak),
    [0, 1, 2, 3, 3],
  );
  const flawed = judgeDrink(r, exact(r), "good", 1_000);
  assert.equal(tipFor(r, flawed, 4).streak, 0);
});

test("serving fills the order book in order and ignores repeats", () => {
  const orders = generateOrders(2, sequence(0.1, 0.6));
  let round = newRound(orders);
  const first = exact(orders[0].recipe);
  round = serve(round, 0, first, "perfect", 1_000);
  const again = serve(round, 0, first, "perfect", 1_000);
  assert.equal(again, round);
  assert.equal(serve(round, 5, first, "perfect", 1_000), round);
  assert.equal(round.served.length, 1);
  assert.equal(streakOf(round), 1);
  assert.equal(roundResult(round), null);

  round = serve(round, 1, exact(orders[1].recipe), "perfect", 1_000);
  assert.equal(streakOf(round), 2);
  assert.equal(round.served[1].tip.streak, 1);
  assert.equal(serve(round, 2, first, "perfect", 1_000), round);
  const result = roundResult(round);
  assert.ok(result);
  assert.equal(result.served, 2);
  assert.equal(result.perfect, 2);
  assert.equal(
    result.tips,
    round.served[0].tip.total + round.served[1].tip.total,
  );
  assert.equal(result.tips, maxTips(orders));
  assert.equal(result.grade, "S");
});

test("sent-back drinks do not count as served and reset the streak", () => {
  const orders = generateOrders(3, sequence(0.2, 0.5, 0.8));
  let round = newRound(orders);
  round = serve(round, 0, exact(orders[0].recipe), "perfect", 1_000);
  round = serve(
    round,
    1,
    { ingredients: [], glass: null, garnish: null },
    "perfect",
    1_000,
  );
  assert.equal(streakOf(round), 0);
  round = serve(round, 2, exact(orders[2].recipe), "perfect", 1_000);
  assert.equal(round.served[2].tip.streak, 0);
  const result = roundResult(round);
  assert.ok(result);
  assert.equal(result.served, 2);
  assert.equal(result.perfect, 2);
});

test("grades compare tips with the best possible round", () => {
  assert.equal(gradeFor(90, 100), "S");
  assert.equal(gradeFor(89, 100), "A");
  assert.equal(gradeFor(75, 100), "A");
  assert.equal(gradeFor(50, 100), "B");
  assert.equal(gradeFor(49, 100), "C");
  assert.equal(gradeFor(0, 0), "C");
});
