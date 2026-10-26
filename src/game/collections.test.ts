import assert from "node:assert/strict";
import { test } from "node:test";
import { shopItem } from "./shop.ts";
import {
  ALBUM_PLACES,
  claimSet,
  CLOSET_SETS,
  cleanSets,
  cleanVisited,
  setProgress,
  stickers,
  visit,
} from "./collections.ts";

test("every closet set is made of real shop items, with a reward", () => {
  assert.ok(CLOSET_SETS.length >= 4);
  for (const set of CLOSET_SETS) {
    assert.ok(set.items.length >= 3, set.id);
    for (const id of set.items) assert.ok(shopItem(id), `${set.id}: ${id}`);
    assert.ok(set.reward > 0);
  }
});

test("a set counts the pieces you own", () => {
  const set = CLOSET_SETS[0]!;
  assert.deepEqual(setProgress(set, []), {
    owned: 0,
    total: set.items.length,
    complete: false,
  });
  assert.equal(setProgress(set, set.items).complete, true);
});

test("a complete set pays its reward once; an incomplete one pays nothing", () => {
  const set = CLOSET_SETS[0]!;
  const half = claimSet({ coins: 10, wardrobe: [], sets: [] }, set.id);
  assert.deepEqual(half, { ok: false, reason: "incomplete" });
  const done = claimSet({ coins: 10, wardrobe: set.items, sets: [] }, set.id);
  assert.deepEqual(done, { ok: true, coins: 10 + set.reward, sets: [set.id] });
  const again = claimSet(
    { coins: 10, wardrobe: set.items, sets: [set.id] },
    set.id,
  );
  assert.deepEqual(again, { ok: false, reason: "claimed" });
  assert.deepEqual(claimSet({ coins: 0, wardrobe: [], sets: [] }, "nope"), {
    ok: false,
    reason: "unknown",
  });
});

test("visiting a place adds it to the album once, in order", () => {
  assert.deepEqual(visit([], "karaoke"), ["karaoke"]);
  assert.deepEqual(visit(["karaoke"], "karaoke"), ["karaoke"]);
  assert.deepEqual(visit(["karaoke"], "bowling"), ["karaoke", "bowling"]);
  // the cells are no photo op
  assert.deepEqual(visit([], "jail"), []);
  assert.ok(!ALBUM_PLACES.includes("jail"));
});

test("stickers are your best grade in each game, none until you've played", () => {
  const book = stickers({ bowling: 300 });
  const bowling = book.find((s) => s.game === "bowling");
  assert.equal(bowling?.grade, "S");
  assert.ok(book.filter((s) => s.grade === null).length > 0);
});

test("stored album fields are cleaned: unknown places and sets drop out", () => {
  assert.deepEqual(cleanVisited(["karaoke", "nowhere", 4, "karaoke"]), [
    "karaoke",
  ]);
  assert.deepEqual(cleanVisited("karaoke"), []);
  assert.deepEqual(cleanSets([CLOSET_SETS[0]!.id, "fake", null]), [
    CLOSET_SETS[0]!.id,
  ]);
});
