// Shops: items are real catalog options with unique ids and whole prices, every
// store sells something, and buying spends once and adds to the wardrobe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PIERCING_STYLES,
  piercingsOf,
  DEFAULT_LOOK,
  EYESHADOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  OUTFIT_COLORS,
  OUTFITS,
  type Look,
  SHOES,
  shoesOf,
  validateLook,
} from "./look.ts";
import {
  pierce,
  SHOP_ITEMS,
  buyItem,
  cleanWardrobe,
  itemLabel,
  itemsIn,
  shopItem,
  thriftFind,
  unlockedLook,
  wearable,
  wearableGarments,
  wearItem,
  garmentPrice,
  garmentShopItem,
  ownsGarment,
  ownsOutfit,
  outfitPrice,
  outfitShopItem,
  shopName,
} from "./shop.ts";
import { encodeWear, garment } from "./wardrobe.ts";

const catalogs = {
  outfit: OUTFITS,
  outfitColor: OUTFIT_COLORS,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  lips: LIPS,
  shadow: EYESHADOWS,
  piercing: PIERCING_STYLES,
  shoes: SHOES,
} as const;

test("every shop item is a real catalog option in its slot", () => {
  for (const item of SHOP_ITEMS) {
    const options: readonly { id: string }[] = catalogs[item.slot];
    assert.ok(
      options.some((option) => option.id === item.id),
      `${item.id} is not a ${item.slot} option`,
    );
  }
});

test("shop item ids are unique and every price is a positive whole number", () => {
  const ids = SHOP_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of SHOP_ITEMS) {
    assert.ok(Number.isInteger(item.price) && item.price > 0, item.id);
  }
});

test("every store sells something", () => {
  for (const store of ["boutique", "beauty", "salon", "piercing"] as const) {
    assert.ok(
      SHOP_ITEMS.some((item) => item.store === store),
      store,
    );
  }
});

test("buying spends the price and adds the item to the wardrobe", () => {
  const item = SHOP_ITEMS[0];
  const result = buyItem({ coins: item.price, wardrobe: [] }, item.id);
  assert.deepEqual(result, {
    ok: true,
    state: { coins: 0, wardrobe: [item.id] },
  });
});

test("an owned item is never charged or added twice", () => {
  const item = SHOP_ITEMS[0];
  const once = buyItem({ coins: item.price * 3, wardrobe: [] }, item.id);
  assert.equal(once.ok, true);
  if (!once.ok) return;
  const again = buyItem(once.state, item.id);
  assert.deepEqual(again, { ok: false, reason: "owned" });
  assert.equal(once.state.coins, item.price * 2);
});

test("a purchase the wallet cannot cover changes nothing", () => {
  const item = SHOP_ITEMS[0];
  assert.deepEqual(buyItem({ coins: item.price - 1, wardrobe: [] }, item.id), {
    ok: false,
    reason: "broke",
  });
});

test("unknown items cannot be bought", () => {
  assert.deepEqual(buyItem({ coins: 9999, wardrobe: [] }, "mystery-box"), {
    ok: false,
    reason: "unknown",
  });
  assert.equal(shopItem("mystery-box"), undefined);
});

test("locked shop looks fall back to the default until owned", () => {
  const look: Look = {
    ...DEFAULT_LOOK,
    outfit: "tracksuit-y2k",
    hairStyle: "sleek-bob",
    lips: "lips-chrome-berry",
    shadow: "#2e7dff",
  };
  assert.deepEqual(unlockedLook(look, []), {
    ...DEFAULT_LOOK,
    lips: look.lips,
    shadow: look.shadow,
  });
  const owned = ["tracksuit-y2k", "sleek-bob", "lips-chrome-berry"];
  assert.deepEqual(unlockedLook(look, owned), {
    ...DEFAULT_LOOK,
    outfit: "tracksuit-y2k",
    hairStyle: "sleek-bob",
    lips: "lips-chrome-berry",
    shadow: look.shadow,
  });
});

test("free catalog looks are never locked", () => {
  const look: Look = { ...DEFAULT_LOOK, hairStyle: "buns", outfit: "fur" };
  assert.deepEqual(unlockedLook(look, []), look);
});

test("all hair colors are available without a purchase", () => {
  const look: Look = { ...DEFAULT_LOOK, hairColor: "#7ee8a2" };
  assert.equal(unlockedLook(look, []).hairColor, look.hairColor);
  assert.equal(unlockedLook(look, ["#7ee8a2"]).hairColor, "#7ee8a2");
});

test("every lipstick color stays available without a wardrobe purchase", () => {
  for (const { id } of LIPS) {
    const look = { ...DEFAULT_LOOK, lips: id };
    assert.equal(unlockedLook(look, []).lips, id);
  }
});

test("cleanWardrobe keeps known, unique ids and drops the rest", () => {
  const known = SHOP_ITEMS[0].id;
  assert.deepEqual(cleanWardrobe([known, known, "mystery-box", 3]), [known]);
  assert.deepEqual(cleanWardrobe("nope"), []);
  assert.deepEqual(cleanWardrobe(undefined), []);
});

test("the closet lists free options and owned shop items only", () => {
  const owned = SHOP_ITEMS.find((item) => item.slot === "outfit");
  assert.ok(owned);
  const options = wearable(OUTFITS, [owned.id]);
  assert.ok(options.some((option) => option.id === owned.id));
  assert.ok(!options.some((option) => option.id === "glam-faux-fur"));
  assert.deepEqual(
    wearable(OUTFITS, []).map((option) => option.id),
    [
      "flares",
      "mini",
      "fur",
      "jeans",
      "shorts",
      "blouse",
      // menswear is free: a new player of either build has clothes to wear
      "denim-shirt",
      "striped-shirt",
      "puffer",
      "white-tee",
      "suit",
      "overalls",
    ],
  );
});

test("every store's items have shelf names and can be worn", () => {
  for (const store of ["boutique", "beauty", "salon", "thrift"] as const) {
    const items = itemsIn(store);
    assert.ok(items.length > 0, store);
    for (const item of items) {
      assert.notEqual(itemLabel(item), item.id, item.id);
      const worn = wearItem(DEFAULT_LOOK, item);
      assert.equal(
        item.slot === "piercing" ? piercingsOf(worn).nose : worn[item.slot],
        item.id,
      );
    }
  }
});

test("fine jewelry goes in at any spot, and comes out when it isn't owned", () => {
  const look = pierce(DEFAULT_LOOK, "brow", "diamond-stud");
  assert.equal(piercingsOf(look).brow, "diamond-stud");
  assert.equal(piercingsOf(unlockedLook(look, [])).brow, "none");
  assert.equal(
    piercingsOf(unlockedLook(look, ["diamond-stud"])).brow,
    "diamond-stud",
  );
  const silver = pierce(DEFAULT_LOOK, "lip", "silver-ring");
  assert.equal(piercingsOf(unlockedLook(silver, [])).lip, "silver-ring");
  assert.equal(pierce(DEFAULT_LOOK, "lip", "made-up"), DEFAULT_LOOK);
});

test("the thrift shop's find of the day is a boutique outfit at half price", () => {
  const finds = new Set<string>();
  for (let day = 0; day < 8; day++) {
    const find = thriftFind(day);
    const full = shopItem(find.id);
    assert.equal(full?.store, "boutique");
    assert.equal(find.price, Math.round((full?.price ?? 0) / 2));
    finds.add(find.id);
  }
  assert.ok(finds.size > 1, "the find changes from day to day");
});

test("buying the find pays the thrift price, and dyes stay available", () => {
  const find = thriftFind(3);
  const r = buyItem({ coins: find.price, wardrobe: [] }, find.id, "thrift", 3);
  assert.deepEqual(r, { ok: true, state: { coins: 0, wardrobe: [find.id] } });
  assert.equal(
    buyItem({ coins: find.price, wardrobe: [] }, find.id).ok,
    false,
    "at the boutique it's full price",
  );
  const dyed = { ...DEFAULT_LOOK, outfitColor: "#c9a227" } as const;
  assert.equal(unlockedLook(dyed, []).outfitColor, dyed.outfitColor);
  assert.equal(unlockedLook(dyed, ["#c9a227"]).outfitColor, "#c9a227");
});

test("shoes: the outfit's own by default, Platform Palace's once bought", () => {
  const boots = itemsIn("shoes").find((i) => i.id === "boots");
  assert.ok(boots);
  const booted = wearItem(DEFAULT_LOOK, boots);
  assert.equal(booted.shoes, "boots");
  assert.ok(validateLook(booted));
  assert.equal(shoesOf(booted), "boots");
  assert.equal(shoesOf(DEFAULT_LOOK), shoesOf({ ...DEFAULT_LOOK }));
  // not owned: they come off, and the key goes with them
  const unowned = unlockedLook(booted, []);
  assert.equal("shoes" in unowned, false);
  assert.ok(validateLook(unowned));
  assert.equal(unlockedLook(booted, ["boots"]).shoes, "boots");
  // sneakers are everyone's
  assert.equal(
    unlockedLook({ ...DEFAULT_LOOK, shoes: "sneakers" }, []).shoes,
    "sneakers",
  );
  assert.equal(validateLook({ ...DEFAULT_LOOK, shoes: "heels" }), false);
});

test("garments split from a boutique outfit are locked until it is bought", () => {
  const corset = shopItem("corset-maxi");
  assert.ok(corset, "the corset outfit is a shop item");
  const ids = (wardrobe: string[]) =>
    wearableGarments(wardrobe).map((g) => g.id);
  assert.equal(ids([]).includes("corset"), false);
  assert.equal(ids([]).includes("tee"), true);
  assert.equal(ids(["corset-maxi"]).includes("maxi-skirt"), true);
  const laced = {
    ...DEFAULT_LOOK,
    wear: encodeWear({
      top: { id: "corset", color: "#141018" },
      bottom: { id: "skinny-jeans", color: "#3a5a8a" },
    }),
  };
  // not owned: the wear code comes off and the look wears its outfit
  const unowned = unlockedLook(laced, []);
  assert.equal("wear" in unowned, false);
  assert.ok(validateLook(unowned));
  assert.equal(unlockedLook(laced, ["corset-maxi"]).wear, laced.wear);
  // trying on a whole outfit takes the mixed garments off
  assert.equal("wear" in wearItem(laced, corset), false);
});

test("ownsGarment, garmentPrice and garmentShopItem reflect shop outfits", () => {
  const corset = garment("corset");
  const tee = garment("tee");
  const tights = garment("tights");
  assert.ok(corset && tee && tights);

  assert.equal(ownsGarment(corset, []), false);
  assert.equal(ownsGarment(corset, ["corset-maxi"]), true);
  assert.equal(ownsGarment(tee, []), true);
  assert.equal(ownsGarment(tights, []), true);

  assert.equal(garmentPrice(corset), 90);
  assert.equal(garmentPrice(tee), null);
  assert.equal(garmentPrice(tights), null);

  assert.equal(garmentShopItem(corset)?.id, "corset-maxi");
  assert.equal(garmentShopItem(corset)?.store, "boutique");
  assert.equal(garmentShopItem(tee), undefined);
  assert.equal(garmentShopItem(tights), undefined);

  assert.equal(shopName("boutique"), "Glitterbox");
});

test("ownsOutfit, outfitPrice and outfitShopItem reflect shop outfits", () => {
  assert.equal(ownsOutfit("tracksuit-y2k", []), false);
  assert.equal(ownsOutfit("tracksuit-y2k", ["tracksuit-y2k"]), true);
  assert.equal(ownsOutfit("flares", []), true);

  assert.equal(outfitPrice("tracksuit-y2k"), 60);
  assert.equal(outfitPrice("flares"), null);

  assert.equal(outfitShopItem("tracksuit-y2k")?.id, "tracksuit-y2k");
  assert.equal(outfitShopItem("tracksuit-y2k")?.store, "boutique");
  assert.equal(outfitShopItem("flares"), undefined);
});
