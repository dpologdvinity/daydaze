// The mix-and-match wardrobe: garment catalog per slot, the slot rules (a
// one-piece replaces top and bottom), the wear code and how old outfit looks
// map onto their garments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { DEFAULT_LOOK, OUTFITS, validateLook } from "./look.ts";
import {
  GARMENTS,
  OUTFIT_WEAR,
  SLOTS,
  decodeWear,
  encodeWear,
  garmentsIn,
  isWearValid,
  putOn,
  recolor,
  takeOff,
  wearOf,
  type Wear,
} from "./wardrobe.ts";

const tee: Wear = {
  top: { id: "tee", color: "#ff2f9a" },
  bottom: { id: "skinny-jeans", color: "#141018" },
};

test("garment ids are unique and each sits in one known slot", () => {
  const ids = GARMENTS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of GARMENTS) assert.ok(SLOTS.includes(g.slot), g.id);
  // every slot has something to wear
  for (const slot of SLOTS) assert.ok(garmentsIn(slot).length > 0, slot);
});

test("every old outfit maps to garments, so nothing is lost", () => {
  const used = new Set<string>();
  for (const { id } of OUTFITS) {
    const wear = wearOf({
      ...DEFAULT_LOOK,
      outfit: id,
      outfitColor: "#3fe0d0",
    });
    assert.ok(isWearValid(wear), id);
    for (const worn of Object.values(wear)) {
      assert.equal(worn.color, "#3fe0d0", id);
      used.add(worn.id);
    }
  }
  // every garment split from an outfit is worn by that outfit
  for (const g of GARMENTS)
    if (g.from) assert.ok(used.has(g.id), `${g.id} unused`);
  assert.deepEqual(
    Object.keys(OUTFIT_WEAR).sort(),
    OUTFITS.map((o) => o.id).sort(),
  );
});

test("a look without a wear code wears its outfit's top and bottom", () => {
  const look = {
    ...DEFAULT_LOOK,
    outfit: "jeans" as const,
    outfitColor: "#141018",
  };
  assert.deepEqual(wearOf(look), {
    top: { id: "tee", color: "#141018" },
    bottom: { id: "skinny-jeans", color: "#141018" },
  });
  // a bad code falls back to the outfit too
  assert.deepEqual(wearOf({ ...look, wear: "nope" }), wearOf(look));
});

test("wear codes round-trip and reject junk", () => {
  const layered: Wear = {
    ...tee,
    outer: { id: "fur-jacket", color: "#e8e2ff" },
    legwear: { id: "tights", color: "#141018" },
  };
  assert.deepEqual(decodeWear(encodeWear(layered)), layered);
  assert.deepEqual(
    wearOf({ ...DEFAULT_LOOK, wear: encodeWear(layered) }),
    layered,
  );
  for (const junk of [
    "",
    7,
    null,
    "tee#ff2f9a", // no bottom
    "tee#ff2f9a+skinny-jeans", // no color
    "tee#ff2f9a+skinny-jeans#zzzzzz",
    "tee#ff2f9a+white-tee#ffffff+skinny-jeans#141018", // two tops
    "sundress#ff2f9a+skinny-jeans#141018", // a one-piece over a bottom
    "tee#ff2f9a+skinny-jeans#141018+cape#000000", // unknown garment
    "tee#ff2f9a+skinny-jeans#141018+".repeat(3),
  ])
    assert.equal(decodeWear(junk), null, String(junk));
});

test("validateLook takes a valid wear code and refuses a bad one", () => {
  assert.equal(validateLook({ ...DEFAULT_LOOK, wear: encodeWear(tee) }), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, wear: "tee#ff2f9a" }), false);
  assert.equal(validateLook({ ...DEFAULT_LOOK, wear: 3 }), false);
});

test("a one-piece replaces the top and bottom", () => {
  const dressed = putOn(tee, "sundress", "#ffb02e");
  assert.deepEqual(dressed, { dress: { id: "sundress", color: "#ffb02e" } });
  assert.ok(isWearValid(dressed));
});

test("a top or bottom over a one-piece swaps it for separates", () => {
  const gown: Wear = {
    dress: { id: "sequin-gown", color: "#9b5cff" },
    outer: { id: "fur-wrap", color: "#e8e2ff" },
  };
  const topped = putOn(gown, "tee", "#ffb02e");
  assert.equal(topped.dress, undefined);
  assert.deepEqual(topped.top, { id: "tee", color: "#ffb02e" });
  // the missing half comes from the house look, in the one-piece's color
  assert.equal(topped.bottom?.color, "#9b5cff");
  assert.deepEqual(topped.outer, gown.outer);
  assert.ok(isWearValid(topped));
  const bottomed = putOn(gown, "cargos", "#6b7a2a");
  assert.deepEqual(bottomed.bottom, { id: "cargos", color: "#6b7a2a" });
  assert.ok(bottomed.top);
  assert.ok(isWearValid(bottomed));
});

test("outerwear and legwear layer on and come off; top and bottom stay", () => {
  const coat = putOn(tee, "puffer", "#141018");
  assert.deepEqual(coat.outer, { id: "puffer", color: "#141018" });
  assert.deepEqual({ ...coat, outer: undefined }, { ...tee, outer: undefined });
  assert.deepEqual(takeOff(coat, "outer"), tee);
  assert.deepEqual(takeOff(tee, "top"), tee);
  assert.deepEqual(takeOff(tee, "bottom"), tee);
  const legs = putOn(tee, "knee-socks", "#e8e2ff");
  assert.deepEqual(takeOff(legs, "legwear"), tee);
  // unknown garments change nothing
  assert.deepEqual(putOn(tee, "cape", "#000000"), tee);
  assert.deepEqual(putOn(tee, "tee", "nope"), tee);
});

test("recolor dyes every worn garment and keeps bad colors out", () => {
  const coat = putOn(tee, "puffer", "#141018");
  const dyed = recolor(coat, "#c9a227");
  for (const worn of Object.values(dyed)) assert.equal(worn.color, "#c9a227");
  assert.deepEqual(Object.keys(dyed).sort(), Object.keys(coat).sort());
  assert.deepEqual(recolor(coat, "red"), coat);
});

test("every closet garment has a rendered thumbnail", () => {
  const missing = GARMENTS.filter(
    ({ id }) =>
      !existsSync(
        new URL(`../../public/closet/garment-${id}.webp`, import.meta.url),
      ),
  ).map(({ id }) => id);
  assert.deepEqual(missing, []);
});
