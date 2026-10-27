// Menus at the default 13+ tier: no alcohol in any venue name, cuisine or dish.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_VENUES } from "./venues.ts";

const ALCOHOL =
  /\b(sake|margarita|sangria|lager|martini|old fashioned|wine|kir royale|beer hall|bierhaus|pub)\b/i;

test("13+ menus and venue names carry no alcohol", () => {
  const names = FOOD_VENUES.flatMap((v) => [
    v.name,
    v.cuisine,
    ...v.menu.map((m) => m.name),
  ]);
  assert.deepEqual(
    names.filter((n) => ALCOHOL.test(n)),
    [],
  );
});
