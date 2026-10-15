import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_VENUES, venueById, menuItemById } from "./venues.ts";
import { NEIGHBORHOOD_IDS } from "../dialogue/types.ts";

// Real brands and chains, matched loosely so spacing and case do not matter.
const BANNED = [
  "mcdonald",
  "burger king",
  "wendy",
  "kfc",
  "taco bell",
  "popeyes",
  "jollibee",
  "chick-fil",
  "dunkin",
  "dairy queen",
  "starbucks",
  "tim hortons",
  "gong cha",
  "tiger sugar",
  "kung fu tea",
  "shake shack",
  "krispy",
  "cinnabon",
  "pizza hut",
  "domino",
  "chipotle",
  "subway",
  "olive garden",
  "applebee",
  "chili's",
  "sephora",
  "doordash",
  "uber",
  "grubhub",
  "postmates",
  "ben & jerry",
  "baskin",
  "haagen",
  "ihop",
  "denny's",
];

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

test("there are about 100 venues", () => {
  assert.ok(FOOD_VENUES.length >= 100, `got ${FOOD_VENUES.length}`);
  assert.ok(FOOD_VENUES.length <= 120, `got ${FOOD_VENUES.length}`);
});

test("venue ids and names are unique", () => {
  const ids = new Set(FOOD_VENUES.map((v) => v.id));
  const names = new Set(FOOD_VENUES.map((v) => v.name.toLowerCase()));
  assert.equal(ids.size, FOOD_VENUES.length);
  assert.equal(names.size, FOOD_VENUES.length);
});

test("menu item ids are unique across all venues", () => {
  const ids = FOOD_VENUES.flatMap((v) => v.menu.map((m) => m.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("every venue names no real brand", () => {
  for (const venue of FOOD_VENUES) {
    const text = [venue.name, venue.cuisine, ...venue.menu.map((m) => m.name)]
      .join(" ")
      .toLowerCase();
    for (const brand of BANNED) {
      assert.equal(
        text.includes(brand),
        false,
        `${venue.name} mentions ${brand}`,
      );
    }
  }
});

test("every menu has at least 3 items with sane prices", () => {
  for (const venue of FOOD_VENUES) {
    assert.ok(venue.menu.length >= 3, `${venue.name} has ${venue.menu.length}`);
    for (const item of venue.menu) {
      assert.ok(Number.isInteger(item.price), `${item.name} price`);
      assert.ok(item.price >= 1 && item.price <= 60, `${item.name} price`);
      assert.ok(item.kind === "food" || item.kind === "drink", item.name);
    }
  }
});

test("every venue sits in a known neighborhood and has an id slug", () => {
  for (const venue of FOOD_VENUES) {
    assert.ok(
      (NEIGHBORHOOD_IDS as readonly string[]).includes(venue.neighborhood),
      venue.name,
    );
    assert.equal(venue.id, slug(venue.id), venue.id);
  }
});

test("the Filipino, matcha, boba and ube places are on the list", () => {
  const cuisines = FOOD_VENUES.map((v) => v.cuisine);
  for (const cuisine of [
    "Filipino",
    "Matcha",
    "Boba",
    "Ube",
    "Fried chicken",
  ]) {
    assert.ok(
      cuisines.some((c) => c.includes(cuisine)) ||
        FOOD_VENUES.some((v) => v.name.includes(cuisine)),
      cuisine,
    );
  }
});

test("venueById and menuItemById find entries and reject unknown ids", () => {
  const venue = FOOD_VENUES[0];
  assert.equal(venueById(venue.id), venue);
  assert.equal(venueById("nope"), undefined);
  const item = venue.menu[0];
  assert.deepEqual(menuItemById(item.id), { venue, item });
  assert.equal(menuItemById("nope"), undefined);
});
