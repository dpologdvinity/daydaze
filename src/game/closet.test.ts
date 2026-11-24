// The closet's scaling tools: style tags, name search, favorites and saved
// outfits, and the cleaning that keeps old or tampered saves loading.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GARMENT_STYLES,
  MAX_OUTFITS,
  NO_CLOSET,
  cleanCloset,
  deleteOutfit,
  filterGarments,
  saveOutfit,
  toggleFavorite,
} from "./closet.ts";
import { GARMENTS, encodeWear, outfitWear } from "./wardrobe.ts";

const jeansWear = encodeWear(outfitWear("jeans", "#3fe0d0"));

test("every garment has at least one style", () => {
  for (const g of GARMENTS)
    assert.ok(GARMENT_STYLES[g.id].length > 0, `${g.id} has no style`);
});

test("filterGarments searches names, case-insensitively and by word", () => {
  const found = filterGarments(GARMENTS, { query: "  HOODIE " }, []);
  assert.deepEqual(found.map((g) => g.id).sort(), [
    "cropped-hoodie",
    "velour-hoodie",
  ]);
  assert.equal(filterGarments(GARMENTS, { query: "zzzz" }, []).length, 0);
  assert.equal(
    filterGarments(GARMENTS, { query: "" }, []).length,
    GARMENTS.length,
  );
});

test("filterGarments narrows by style and to favorites", () => {
  const formal = filterGarments(GARMENTS, { style: "formal" }, []);
  assert.ok(formal.some((g) => g.id === "suit-jacket"));
  assert.ok(formal.every((g) => GARMENT_STYLES[g.id].includes("formal")));
  const picks = filterGarments(GARMENTS, { favoritesOnly: true }, ["tee"]);
  assert.deepEqual(
    picks.map((g) => g.id),
    ["tee"],
  );
});

test("favorites come first, in catalog order otherwise", () => {
  const tops = GARMENTS.filter((g) => g.slot === "top");
  const sorted = filterGarments(tops, {}, ["suit-jacket"]);
  assert.equal(sorted[0]?.id, "suit-jacket");
  assert.equal(sorted[1]?.id, tops[0]?.id);
});

test("toggleFavorite adds and removes, ignoring unknown ids", () => {
  const on = toggleFavorite(NO_CLOSET, "tee");
  assert.deepEqual(on.favorites, ["tee"]);
  assert.deepEqual(toggleFavorite(on, "tee").favorites, []);
  assert.equal(toggleFavorite(NO_CLOSET, "nope"), NO_CLOSET);
});

test("saveOutfit stores a valid wear under a trimmed name, replacing a repeat", () => {
  const a = saveOutfit(NO_CLOSET, "  Brunch ", jeansWear);
  assert.deepEqual(a.outfits, [{ name: "Brunch", wear: jeansWear }]);
  const b = saveOutfit(a, "brunch", jeansWear);
  assert.equal(b.outfits.length, 1);
  assert.equal(saveOutfit(NO_CLOSET, "", jeansWear), NO_CLOSET);
  assert.equal(saveOutfit(NO_CLOSET, "x".repeat(25), jeansWear), NO_CLOSET);
  assert.equal(saveOutfit(NO_CLOSET, "Bad", "nonsense#fff"), NO_CLOSET);
});

test("saveOutfit stops at the cap rather than dropping an older outfit", () => {
  let closet = NO_CLOSET;
  for (let i = 0; i < MAX_OUTFITS + 3; i++)
    closet = saveOutfit(closet, `Fit ${i}`, jeansWear);
  assert.equal(closet.outfits.length, MAX_OUTFITS);
  assert.equal(closet.outfits[0]?.name, "Fit 0");
});

test("deleteOutfit removes by name", () => {
  const closet = saveOutfit(NO_CLOSET, "Brunch", jeansWear);
  assert.deepEqual(deleteOutfit(closet, "Brunch").outfits, []);
});

test("cleanCloset keeps what validates: old saves have none", () => {
  assert.deepEqual(cleanCloset(undefined), NO_CLOSET);
  assert.deepEqual(cleanCloset("x"), NO_CLOSET);
  const cleaned = cleanCloset({
    favorites: ["tee", "tee", "nope", 4],
    outfits: [
      { name: "Ok", wear: jeansWear },
      { name: "Bad wear", wear: "tee#ff0000" },
      { name: "", wear: jeansWear },
      { name: "Ok", wear: jeansWear },
      null,
    ],
  });
  assert.deepEqual(cleaned.favorites, ["tee"]);
  assert.deepEqual(cleaned.outfits, [{ name: "Ok", wear: jeansWear }]);
});

test("filterGarments includes boutique shop garments", () => {
  const hoodies = filterGarments(GARMENTS, { query: "hoodie" }, []);
  const ids = hoodies.map((g) => g.id);
  assert.ok(ids.includes("velour-hoodie"));
  assert.ok(ids.includes("cropped-hoodie"));
});
