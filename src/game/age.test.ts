import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADULT_ROOMS,
  activeTier,
  allows,
  byTier,
  contentTier,
  mayEnter,
} from "./age.ts";

test("18+ rooms are shut without the age check; the rest are open", () => {
  assert.ok(ADULT_ROOMS.has("green-haze"));
  assert.equal(mayEnter("green-haze", false), false);
  assert.equal(mayEnter("green-haze", true), true);
  assert.equal(mayEnter("velvet-room", false), true);
});

test("the tier gate: 13+ by default, adult content only for the adult tier", () => {
  assert.equal(contentTier(false), "teen");
  assert.equal(contentTier(true), "adult");
  for (const feature of ["alcohol", "drugs", "adult-venues"] as const) {
    assert.equal(allows("teen", feature), false);
    assert.equal(allows("adult", feature), true);
  }
  assert.equal(activeTier(), "teen");
  assert.equal(byTier("beer", "soda"), "soda");
  assert.equal(byTier("beer", "soda", "adult"), "beer");
});

test("allows() answers per feature", () => {
  assert.equal(allows("teen", "alcohol"), false);
  assert.equal(allows("adult", "drugs"), true);
});
