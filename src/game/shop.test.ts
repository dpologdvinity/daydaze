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
  wearItem,
} from "./shop.ts";

const catalogs = {
  outfit: OUTFITS,
  outfitColor: OUTFIT_COLORS,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  lips: LIPS,
  shadow: EYESHADOWS,
  piercing: PIERCING_STYLES,
} as const;

test("every shop item is a real catalog option in its slot", () => {
  for (const item of SHOP_ITEMS) {
    const options = catalogs[item.slot] as readonly { id: string }[];
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
  assert.deepEqual(unlockedLook(look, []), DEFAULT_LOOK);
  const owned = ["tracksuit-y2k", "sleek-bob", "lips-chrome-berry"];
  assert.deepEqual(unlockedLook(look, owned), {
    ...DEFAULT_LOOK,
    outfit: "tracksuit-y2k",
    hairStyle: "sleek-bob",
    lips: "lips-chrome-berry",
  });
});

test("free catalog looks are never locked", () => {
  const look: Look = { ...DEFAULT_LOOK, hairStyle: "buns", outfit: "fur" };
  assert.deepEqual(unlockedLook(look, []), look);
});

test("a locked hair color falls back to the default too", () => {
  const look: Look = { ...DEFAULT_LOOK, hairColor: "#7ee8a2" };
  assert.equal(unlockedLook(look, []).hairColor, DEFAULT_LOOK.hairColor);
  assert.equal(unlockedLook(look, ["#7ee8a2"]).hairColor, "#7ee8a2");
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
    ["flares", "mini", "fur", "jeans", "shorts", "blouse"],
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

test("buying the find pays the thrift price, and dyes come off unowned", () => {
  const find = thriftFind(3);
  const r = buyItem({ coins: find.price, wardrobe: [] }, find.id, "thrift", 3);
  assert.deepEqual(r, { ok: true, state: { coins: 0, wardrobe: [find.id] } });
  assert.equal(
    buyItem({ coins: find.price, wardrobe: [] }, find.id).ok,
    false,
    "at the boutique it's full price",
  );
  const dyed = { ...DEFAULT_LOOK, outfitColor: "#c9a227" } as const;
  assert.equal(unlockedLook(dyed, []).outfitColor, DEFAULT_LOOK.outfitColor);
  assert.equal(unlockedLook(dyed, ["#c9a227"]).outfitColor, "#c9a227");
});
