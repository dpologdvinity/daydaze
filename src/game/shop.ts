// The clothing and beauty shops: the item catalog (each item an option id from
// look.ts), Thrift Temple's daily find, buying into the wardrobe, and taking
// unowned items off a look. Shop items are locked until owned; every other
// catalog option is free.

import {
  DEFAULT_LOOK,
  EYESHADOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  encodePiercings,
  LIPS,
  OUTFIT_COLORS,
  OUTFITS,
  PIERCING_SPOTS,
  PIERCING_STYLES,
  piercingsOf,
  type Look,
  type PiercingSpot,
  isShoe,
  SHOES,
} from "./look.ts";
import { spend } from "./wallet.ts";

/** A store that sells look items. */
export type ShopId =
  "boutique" | "beauty" | "salon" | "piercing" | "thrift" | "shoes";

/** A Look slot a shop item fills; its id is the catalog option in that slot. */
export type ShopSlot =
  | "outfit"
  | "outfitColor"
  | "hairStyle"
  | "hairColor"
  | "lips"
  | "shadow"
  | "piercing"
  | "shoes";

/**
 * An item for sale: its look option id, the slot it fills, the store and the
 * price in coins.
 */
export type ShopItem = {
  id: string;
  slot: ShopSlot;
  store: ShopId;
  price: number;
};

// Original names only. Each id is a catalog option in look.ts.
export const SHOP_ITEMS: readonly ShopItem[] = [
  // Platform Palace: shoes (sneakers are everyone's)
  { id: "platforms", slot: "shoes", store: "shoes", price: 40 },
  { id: "boots", slot: "shoes", store: "shoes", price: 55 },
  // Pixel Mall Boutique: outfits and glam wear
  { id: "tracksuit-y2k", slot: "outfit", store: "boutique", price: 60 },
  { id: "baby-tee-mini", slot: "outfit", store: "boutique", price: 45 },
  { id: "sequin-slip", slot: "outfit", store: "boutique", price: 120 },
  { id: "glam-faux-fur", slot: "outfit", store: "boutique", price: 150 },
  { id: "corset-maxi", slot: "outfit", store: "boutique", price: 90 },
  { id: "cargo-crop", slot: "outfit", store: "boutique", price: 55 },
  { id: "sundress", slot: "outfit", store: "boutique", price: 50 },
  { id: "hoodie-bikers", slot: "outfit", store: "boutique", price: 65 },
  // Glowstick Beauty Supply: lip and eye testers
  { id: "lips-chrome-berry", slot: "lips", store: "beauty", price: 20 },
  {
    id: "lips-blue-raspberry-gloss",
    slot: "lips",
    store: "beauty",
    price: 25,
  },
  { id: "#ffd1f0", slot: "shadow", store: "beauty", price: 15 },
  { id: "#2e7dff", slot: "shadow", store: "beauty", price: 15 },
  // Curl and Chrome Salon: paid styles and color
  { id: "sleek-bob", slot: "hairStyle", store: "salon", price: 80 },
  { id: "curl-cloud", slot: "hairStyle", store: "salon", price: 90 },
  { id: "#7ee8a2", slot: "hairColor", store: "salon", price: 30 },
  { id: "#c0c0c8", slot: "hairColor", store: "salon", price: 35 },
  { id: "#ff8a3d", slot: "hairColor", store: "salon", price: 35 },
  { id: "#3a6bff", slot: "hairColor", store: "salon", price: 35 },
  { id: "#ffb3d9", slot: "hairColor", store: "salon", price: 35 },
  // Ink and Needle: fine jewelry for any piercing spot
  { id: "rose-gold-stud", slot: "piercing", store: "piercing", price: 25 },
  { id: "rose-gold-ring", slot: "piercing", store: "piercing", price: 30 },
  { id: "diamond-stud", slot: "piercing", store: "piercing", price: 45 },
  { id: "opal-stud", slot: "piercing", store: "piercing", price: 40 },
  // Thrift Temple: vintage dyes for any outfit
  { id: "#c9a227", slot: "outfitColor", store: "thrift", price: 15 },
  { id: "#6b7a2a", slot: "outfitColor", store: "thrift", price: 15 },
  { id: "#b5502a", slot: "outfitColor", store: "thrift", price: 15 },
  { id: "#3a5a8a", slot: "outfitColor", store: "thrift", price: 15 },
  { id: "#f2e6c8", slot: "outfitColor", store: "thrift", price: 20 },
  { id: "#6a1a2a", slot: "outfitColor", store: "thrift", price: 20 },
];

/** Thrift Temple's find of the day: one boutique outfit at half price,
 * a different one each day (`day` from challenges.ts `dayOf`). */
export function thriftFind(day: number): ShopItem {
  const rack = itemsIn("boutique").filter((i) => i.slot === "outfit");
  const pick = rack[(((day * 7) % rack.length) + rack.length) % rack.length];
  if (!pick) throw new Error("the boutique sells no outfits");
  return { ...pick, store: "thrift", price: Math.round(pick.price / 2) };
}

/** Every item a store sells on `day`, in catalog order; the thrift shop
 * adds its find of the day first. */
export function itemsIn(store: ShopId, day = 0): ShopItem[] {
  const stock = SHOP_ITEMS.filter((item) => item.store === store);
  return store === "thrift" ? [thriftFind(day), ...stock] : stock;
}

const CATALOGUES: Record<ShopSlot, readonly { id: string; label: string }[]> = {
  outfit: OUTFITS,
  outfitColor: OUTFIT_COLORS,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  lips: LIPS,
  shadow: EYESHADOWS,
  piercing: PIERCING_STYLES,
  shoes: SHOES,
};

/** An item's name on the shelf, from its catalog. */
export function itemLabel(item: ShopItem): string {
  return CATALOGUES[item.slot].find((o) => o.id === item.id)?.label ?? item.id;
}

/** The look with the item put on, when it's a real option for its slot. */
export function wearItem(look: Look, item: ShopItem): Look {
  switch (item.slot) {
    case "outfit": {
      const o = OUTFITS.find((x) => x.id === item.id);
      return o ? { ...look, outfit: o.id } : look;
    }
    case "outfitColor": {
      const o = OUTFIT_COLORS.find((x) => x.id === item.id);
      return o ? { ...look, outfitColor: o.id } : look;
    }
    case "hairStyle": {
      const o = HAIR_STYLES.find((x) => x.id === item.id);
      return o ? { ...look, hairStyle: o.id } : look;
    }
    case "hairColor": {
      const o = HAIR_COLORS.find((x) => x.id === item.id);
      return o ? { ...look, hairColor: o.id } : look;
    }
    case "lips": {
      const o = LIPS.find((x) => x.id === item.id);
      return o ? { ...look, lips: o.id } : look;
    }
    case "shadow": {
      const o = EYESHADOWS.find((x) => x.id === item.id);
      return o ? { ...look, shadow: o.id } : look;
    }
    case "piercing":
      return pierce(look, "nose", item.id);
    case "shoes":
      return isShoe(item.id) ? { ...look, shoes: item.id } : look;
  }
}

/** The look with `style` put in at `spot`, when it's a real style. */
export function pierce(look: Look, spot: PiercingSpot, style: string): Look {
  const o = PIERCING_STYLES.find((x) => x.id === style);
  if (!o) return look;
  return {
    ...look,
    piercings: encodePiercings({ ...piercingsOf(look), [spot]: o.id }),
  };
}

/** The catalog item with this id, at its regular store and price. */
export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

/** The coins and owned items a purchase works on. */
export type Wallet = { coins: number; wardrobe: readonly string[] };

/**
 * A purchase's new wallet, or why it failed: unknown item, already owned, or
 * not enough coins.
 */
export type PurchaseResult =
  | { ok: true; state: Wallet }
  | { ok: false; reason: "unknown" | "owned" | "broke" };

/** Charges once and adds the item to the wardrobe; owning it again is
 * refused. From `store` on `day`, the price is that store's that day. */
export function buyItem(
  state: Wallet,
  id: string,
  store?: ShopId,
  day = 0,
): PurchaseResult {
  const item = store
    ? itemsIn(store, day).find((i) => i.id === id)
    : shopItem(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (state.wardrobe.includes(id)) return { ok: false, reason: "owned" };
  const coins = spend(state.coins, item.price);
  if (coins === null) return { ok: false, reason: "broke" };
  return { ok: true, state: { coins, wardrobe: [...state.wardrobe, id] } };
}

/** Shop items the wardrobe does not own; free catalog options are never locked. */
function locked(id: string, wardrobe: readonly string[]): boolean {
  return shopItem(id) !== undefined && !wardrobe.includes(id);
}

/** The look with every unowned shop item swapped for the default. */
export function unlockedLook(look: Look, wardrobe: readonly string[]): Look {
  // unowned shoes come off, back to the outfit's own
  const { shoes, ...rest } = look;
  const keep = shoes !== undefined && !locked(shoes, wardrobe);
  return {
    ...rest,
    ...(keep ? { shoes } : {}),
    outfit: locked(look.outfit, wardrobe) ? DEFAULT_LOOK.outfit : look.outfit,
    outfitColor: locked(look.outfitColor, wardrobe)
      ? DEFAULT_LOOK.outfitColor
      : look.outfitColor,
    hairStyle: locked(look.hairStyle, wardrobe)
      ? DEFAULT_LOOK.hairStyle
      : look.hairStyle,
    hairColor: locked(look.hairColor, wardrobe)
      ? DEFAULT_LOOK.hairColor
      : look.hairColor,
    lips: locked(look.lips, wardrobe) ? DEFAULT_LOOK.lips : look.lips,
    shadow: locked(look.shadow, wardrobe) ? DEFAULT_LOOK.shadow : look.shadow,
    ...(look.piercings === undefined
      ? {}
      : { piercings: unlockedPiercings(look, wardrobe) }),
  };
}

/** The look's piercings with any unowned jewelry taken out. */
function unlockedPiercings(look: Look, wardrobe: readonly string[]): string {
  const p = piercingsOf(look);
  const out = { ...p };
  for (const spot of PIERCING_SPOTS)
    if (locked(p[spot.id], wardrobe)) out[spot.id] = "none";
  return encodePiercings(out);
}

/** The catalog options the wardrobe can wear: free ones plus owned shop items. */
export function wearable<T extends { id: string }>(
  options: readonly T[],
  wardrobe: readonly string[],
): T[] {
  return options.filter((option) => !locked(option.id, wardrobe));
}

/** Known, unique shop ids only; anything else is dropped. */
export function cleanWardrobe(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  for (const id of value) {
    if (typeof id === "string" && shopItem(id)) ids.add(id);
  }
  return [...ids];
}
