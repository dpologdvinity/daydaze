// Checks the Platform Palace catalog and the shipped meshes for both fits.

import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { buyItem, itemsIn, unlockedLook, wearItem } from "./shop.ts";
import { DEFAULT_LOOK, SHOES, shoesOf, validateLook } from "./look.ts";
import { decodeWear, encodeWear, putOn, takeOff, wearOf } from "./wardrobe.ts";

function assertFits(model: string) {
  for (const suffix of ["", "-m", "-lo", "-m-lo"]) {
    const file = `${model}${suffix}.glb`;
    assert.ok(
      existsSync(new URL(`../../public/models/doll/${file}`, import.meta.url)),
      file,
    );
  }
}

test("each footwear style is selectable and has both fits at both detail levels", () => {
  assert.ok(SHOES.length >= 28, "the closet needs at least 25 footwear styles");
  assert.equal(new Set(SHOES.map(({ id }) => id)).size, SHOES.length);
  for (const { id } of SHOES) {
    const look = { ...DEFAULT_LOOK, shoes: id };
    assert.equal(validateLook(look), true, id);
    assert.equal(shoesOf(look), id);
    assertFits(`shoes-${id}`);
  }
});

test("new shoes can be bought from Platform Palace and worn immediately", () => {
  const stock = itemsIn("shoes");
  for (const { id } of SHOES.filter((shoe) => shoe.id !== "sneakers")) {
    const item = stock.find((entry) => entry.id === id);
    assert.ok(item, id);
    const purchase = buyItem({ coins: item.price, wardrobe: [] }, id, "shoes");
    assert.ok(purchase.ok, id);
    assert.equal(purchase.state.coins, 0, id);
    const look = unlockedLook(
      wearItem(DEFAULT_LOOK, item),
      purchase.state.wardrobe,
    );
    assert.equal(shoesOf(look), id);
  }
});

test("a hat and legwear round-trip together and can be removed independently", () => {
  const wear = putOn(
    putOn(wearOf(DEFAULT_LOOK), "leg-warmers", "#303040"),
    "beanie",
    "#525260",
  );
  assert.deepEqual(decodeWear(encodeWear(wear)), wear);
  assert.equal(takeOff(wear, "hat").legwear?.id, "leg-warmers");
  assert.equal(takeOff(wear, "legwear").hat?.id, "beanie");
  assert.equal(
    putOn(wear, "fishnet-tights", "#111111").legwear?.id,
    "fishnet-tights",
  );
  for (const model of [
    "legwear-crew-socks",
    "legwear-leg-warmers",
    "legwear-sheer-tights",
    "hat-cloche",
    "hat-baseball-cap",
    "hat-newsboy-cap",
    "hat-beanie",
    "hat-bucket-hat",
    "hat-patrol-cap",
    "hat-headscarf",
    "hat-sun-visor",
    "hair-hijab",
  ])
    assertFits(model);
  assert.ok(
    existsSync(
      new URL("../../public/models/doll/fishnet-mask.webp", import.meta.url),
    ),
  );
});
