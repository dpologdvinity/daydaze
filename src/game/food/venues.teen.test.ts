// Menus at the default 13+ tier: no alcohol in any venue name, cuisine or dish.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_VENUES, foodVenuesFor } from "./venues.ts";

const ALCOHOL =
  /\b(sake|margarita|sangria|lager|martini|old fashioned|wine|kir royale|beer hall|bierhaus|pub|makgeolli|izakaya|(?:yuzu|whiskey|pisco) sour|cider|soju|mimosa|stout|tavern|saloon|taproom|cantina|brewery|bourbon|whiskey|vodka|tequila|rum|gin|cocktail)\b|(?<!ginger )\bale\b/i;

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

test("the same builder gives 18+ its alcohol and 13+ none", () => {
  const dishes = (tier: "teen" | "adult") =>
    foodVenuesFor(tier).flatMap((v) => [v.name, ...v.menu.map((m) => m.name)]);
  assert.ok(dishes("adult").includes("Frozen margarita"));
  assert.ok(dishes("adult").includes("Makgeolli"));
  assert.deepEqual(
    dishes("teen").filter((n) => ALCOHOL.test(n)),
    [],
  );
});
