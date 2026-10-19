import assert from "node:assert/strict";
import { test } from "node:test";
import { ESPRESSO } from "./barista.ts";
import { BOBA } from "./boba.ts";
import {
  dump,
  MAX_TIP,
  matches,
  newShift,
  pour,
  score,
  serve,
  shiftOver,
  ticket,
  TICKETS,
} from "./orders.ts";

for (const [name, station] of [
  ["espresso", ESPRESSO],
  ["boba", BOBA],
] as const)
  test(`every ${name} order is made from the station's ingredients`, () => {
    const known = new Set(station.ingredients.map((i) => i.id));
    for (const order of station.menu) {
      assert.ok(
        order.recipe.length > 0 && order.recipe.length <= 6,
        order.name,
      );
      for (const i of order.recipe)
        assert.ok(known.has(i), `${order.name} ${i}`);
    }
    // no two orders want the same cup
    const cups = station.menu.map((o) => [...o.recipe].sort().join());
    assert.equal(new Set(cups).size, cups.length);
  });

test("a seed always deals the same tickets, and different orders come up", () => {
  const names = Array.from(
    { length: TICKETS },
    (_, n) => ticket(ESPRESSO, 7, n).name,
  );
  assert.deepEqual(
    names,
    Array.from({ length: TICKETS }, (_, n) => ticket(ESPRESSO, 7, n).name),
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

test("a right order served fast earns the full tip; a wrong one nothing", () => {
  let s = newShift(3);
  for (const i of ticket(BOBA, 3, 0).recipe) s = pour(BOBA, s, i);
  const quick = serve(BOBA, s, 0);
  assert.equal(quick.right, true);
  assert.equal(quick.tip, MAX_TIP);
  assert.equal(score(quick.shift), 10 + MAX_TIP);
  assert.deepEqual(quick.shift.cup, []);
  const wrong = serve(BOBA, pour(BOBA, quick.shift, "ice"), 0);
  assert.equal(wrong.shift.served, 2);
});

test("only the station's own ingredients go in the cup", () => {
  assert.deepEqual(pour(BOBA, newShift(1), "espresso").cup, []);
});

test("a shift ends after eight tickets, and the cup can be dumped", () => {
  let s = newShift(1);
  assert.deepEqual(dump(pour(ESPRESSO, s, "ice")).cup, []);
  for (let n = 0; n < TICKETS; n++) s = serve(ESPRESSO, s, 1).shift;
  assert.ok(shiftOver(s));
  assert.equal(serve(ESPRESSO, s, 0).shift, s);
  assert.equal(pour(ESPRESSO, s, "ice"), s);
});
