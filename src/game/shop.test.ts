import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOOK,
  EYESHADOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  OUTFITS,
  silhouetteOf,
  type Look,
} from "./look.ts";
import {
  SHOP_ITEMS,
  buyItem,
  cleanWardrobe,
  itemLabel,
  itemsIn,
  shopItem,
  unlockedLook,
  wearable,
  wearItem,
} from "./shop.ts";

const catalogs = {
  outfit: OUTFITS,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  lips: LIPS,
  shadow: EYESHADOWS,
} as const;

test("every shop item is a real catalogue option in its slot", () => {
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
  for (const store of ["boutique", "beauty", "salon"] as const) {
    assert.ok(
      SHOP_ITEMS.some((item) => item.store === store),
      store,
    );
  }
});

test("every shop outfit is cut from a known silhouette", () => {
  for (const option of OUTFITS) {
    assert.ok(
      ["flares", "mini", "fur", "jeans", "shorts", "blouse"].includes(
        silhouetteOf(option.id),
      ),
    );
  }
  assert.equal(silhouetteOf("tracksuit-y2k"), "flares");
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

test("free catalogue looks are never locked", () => {
  const look: Look = { ...DEFAULT_LOOK, hairStyle: "buns", outfit: "fur" };
  assert.deepEqual(unlockedLook(look, []), look);
});

test("a locked hair colour falls back to the default too", () => {
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
  for (const store of ["boutique", "beauty", "salon"] as const) {
    const items = itemsIn(store);
    assert.ok(items.length > 0, store);
    for (const item of items) {
      assert.notEqual(itemLabel(item), item.id, item.id);
      const worn = wearItem(DEFAULT_LOOK, item);
      assert.equal(worn[item.slot], item.id);
    }
  }
});
