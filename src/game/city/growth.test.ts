import assert from "node:assert/strict";
import { test } from "node:test";
import { DECK } from "./boardwalk.ts";
import { ALL_GROWTH, duneGrowth, lawnGrowth, treePitGrowth } from "./growth.ts";
import { PROPS, WATER_Z } from "./layout.ts";

test("lawns, tree pits and dunes all grow something", () => {
  assert.ok(lawnGrowth().length > 500, "front lawns");
  assert.ok(
    treePitGrowth().length >= 7 * PROPS.filter((p) => p.kind === "tree").length,
    "a ring of tufts round every street tree",
  );
  assert.ok(duneGrowth().length > 100, "dune grass");
});

test("dune grass stays on the sand between the deck and the water", () => {
  for (const g of duneGrowth()) {
    assert.ok(g.z > DECK.z1 && g.z < WATER_Z, `dune tuft at ${g.x},${g.z}`);
    assert.ok(Math.abs(g.x - 24) >= 6, "none on the pier's approach");
  }
});

test("the whole city's growth stays a size the client can sort on each plan reload", () => {
  assert.ok(ALL_GROWTH.length < 12_000, `${ALL_GROWTH.length} tufts`);
});
