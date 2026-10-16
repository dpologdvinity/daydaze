import { test } from "node:test";
import assert from "node:assert/strict";
import { relieveBuzz } from "./consume.ts";
import { addDrink } from "../effects/buzz.ts";

test("eating food lowers the buzz", () => {
  const drunk = addDrink(0, "cocktail");
  assert.ok(relieveBuzz(drunk, "food") < drunk);
});

test("a soft drink lowers the buzz too, like water", () => {
  const drunk = addDrink(0, "cocktail");
  assert.ok(relieveBuzz(drunk, "drink") < drunk);
});

test("relief never goes below zero and never raises a sober doll", () => {
  assert.equal(relieveBuzz(0, "food"), 0);
  assert.equal(relieveBuzz(0, "drink"), 0);
  assert.equal(relieveBuzz(-3, "food"), 0);
});
