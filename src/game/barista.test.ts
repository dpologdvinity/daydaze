import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dump,
  INGREDIENTS,
  MAX_TIP,
  matches,
  MENU,
  newShift,
  pour,
  score,
  serve,
  shiftOver,
  ticket,
  TICKETS,
} from "./barista.ts";

const known = new Set<string>(INGREDIENTS.map((i) => i.id));

test("every menu drink is made from the station's ingredients", () => {
  for (const drink of MENU) {
    assert.ok(drink.recipe.length > 0 && drink.recipe.length <= 6, drink.name);
    for (const i of drink.recipe) assert.ok(known.has(i), `${drink.name} ${i}`);
  }
});

test("a seed always deals the same tickets, and different drinks come up", () => {
  const names = Array.from({ length: TICKETS }, (_, n) => ticket(7, n).name);
  assert.deepEqual(
    names,
    Array.from({ length: TICKETS }, (_, n) => ticket(7, n).name),
  );
  assert.ok(new Set(names).size > 2);
});

test("a cup matches its recipe in any order, and not with extra or less", () => {
  assert.ok(
    matches(["foam", "whole", "espresso"], ["espresso", "whole", "foam"]),
  );
  assert.ok(!matches(["espresso", "whole"], ["espresso", "whole", "foam"]));
  assert.ok(!matches(["espresso", "espresso"], ["espresso"]));
});

test("a right drink served fast earns the full tip; a wrong one earns nothing", () => {
  let s = newShift(3);
  for (const i of ticket(3, 0).recipe) s = pour(s, i);
  const quick = serve(s, 0);
  assert.equal(quick.right, true);
  assert.equal(quick.tip, MAX_TIP);
  assert.equal(score(quick.shift), 10 + MAX_TIP);
  assert.deepEqual(quick.shift.cup, []);

  const slow = serve(pour(quick.shift, "ube"), 60);
  assert.equal(slow.right, ticket(3, 1).recipe.join() === "ube");
  assert.equal(slow.shift.served, 2);
});

test("a shift ends after eight tickets, and the cup can be dumped", () => {
  let s = newShift(1);
  assert.deepEqual(dump(pour(s, "ice")).cup, []);
  for (let n = 0; n < TICKETS; n++) s = serve(s, 1).shift;
  assert.ok(shiftOver(s));
  assert.equal(serve(s, 0).shift, s);
  assert.equal(pour(s, "ice"), s);
});
