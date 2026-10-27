// At the 18+ tier a drink raises the buzz. Restores the tier and the buzz after.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setActiveTier } from "../../game/age.ts";
import { ageBuzz, drink, getBuzz } from "./drunk.ts";

test("a drink at 18+ raises the buzz", () => {
  setActiveTier("adult");
  try {
    drink("cocktail");
    assert.ok(getBuzz() > 0);
  } finally {
    setActiveTier("teen"); // tests share one process
    ageBuzz(100_000);
  }
});
