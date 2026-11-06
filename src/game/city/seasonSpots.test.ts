// The seasonal spots follow the real facades, doors and districts.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RAINBOW_LIGHTS,
  WARM_LIGHTS,
  bats,
  facadeLights,
  lanternStrings,
  pumpkins,
  treeLights,
} from "./seasonSpots.ts";

test("fairy lights hang just off the avenue facades, in the palette", () => {
  const bulbs = facadeLights(WARM_LIGHTS);
  assert.ok(bulbs.length > 100);
  for (const b of bulbs) {
    assert.ok(Math.abs(Math.abs(b.at[2]) - 13.6) < 1e-9);
    assert.ok(b.at[1] > 3 && b.at[1] <= 3.9);
    assert.ok(WARM_LIGHTS.some((c) => c === b.color));
  }
  const rainbow = new Set(facadeLights(RAINBOW_LIGHTS).map((b) => b.color));
  assert.equal(rainbow.size, RAINBOW_LIGHTS.length);
});

test("the Plaza tree is wrapped in lights from foot to tip", () => {
  const ys = treeLights().map((b) => b.at[1]);
  assert.ok(Math.min(...ys) < 1.5 && Math.max(...ys) > 7);
});

test("lanterns hang only over Chinatown and Koreatown, above head height", () => {
  const { lanterns, cord } = lanternStrings();
  assert.ok(lanterns.length >= 50 && cord.length > lanterns.length);
  for (const l of lanterns) {
    assert.ok(l.at[0] > 200 && l.at[0] < 448);
    assert.ok(l.at[1] > 4.5);
  }
});

test("pumpkins sit in pairs on the stoops and bats hang over them", () => {
  assert.ok(pumpkins().length > 0 && pumpkins().length % 2 === 0);
  assert.equal(bats().length, (pumpkins().length / 2) * 3);
  for (const p of pumpkins())
    assert.ok(Math.abs(Math.abs(p.at[2]) - 13.2) < 1e-9);
});
