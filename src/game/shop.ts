import { DEFAULT_LOOK, type Look } from "./look.ts";
import { spend } from "./wallet.ts";

export type ShopId = "boutique" | "beauty" | "salon";

/** A Look slot a shop item fills; its id is the catalogue option in that slot. */
export type ShopSlot = "outfit" | "hairStyle" | "hairColor" | "lips" | "shadow";

export type ShopItem = {
  id: string;
  slot: ShopSlot;
  store: ShopId;
  price: number;
};

// Original names only. Each id is a catalogue option in look.ts.
export const SHOP_ITEMS: readonly ShopItem[] = [
  // Pixel Mall Boutique: outfits and glam wear
  { id: "tracksuit-y2k", slot: "outfit", store: "boutique", price: 60 },
  { id: "baby-tee-mini", slot: "outfit", store: "boutique", price: 45 },
  { id: "sequin-slip", slot: "outfit", store: "boutique", price: 120 },
  { id: "glam-faux-fur", slot: "outfit", store: "boutique", price: 150 },
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
  // Curl and Chrome Salon: paid styles and colour
  { id: "sleek-bob", slot: "hairStyle", store: "salon", price: 80 },
  { id: "curl-cloud", slot: "hairStyle", store: "salon", price: 90 },
  { id: "#7ee8a2", slot: "hairColor", store: "salon", price: 30 },
];

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export type Wallet = { coins: number; wardrobe: readonly string[] };

export type PurchaseResult =
  | { ok: true; state: Wallet }
  | { ok: false; reason: "unknown" | "owned" | "broke" };

/** Charges once and adds the item to the wardrobe; owning it again is refused. */
export function buyItem(state: Wallet, id: string): PurchaseResult {
  const item = shopItem(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (state.wardrobe.includes(id)) return { ok: false, reason: "owned" };
  const coins = spend(state.coins, item.price);
  if (coins === null) return { ok: false, reason: "broke" };
  return { ok: true, state: { coins, wardrobe: [...state.wardrobe, id] } };
}

/** Shop items the wardrobe does not own; free catalogue options are never locked. */
function locked(id: string, wardrobe: readonly string[]): boolean {
  return shopItem(id) !== undefined && !wardrobe.includes(id);
}

/** The look with every unowned shop item swapped for the default. */
export function unlockedLook(look: Look, wardrobe: readonly string[]): Look {
  return {
    ...look,
    outfit: locked(look.outfit, wardrobe) ? DEFAULT_LOOK.outfit : look.outfit,
    hairStyle: locked(look.hairStyle, wardrobe)
      ? DEFAULT_LOOK.hairStyle
      : look.hairStyle,
    hairColor: locked(look.hairColor, wardrobe)
      ? DEFAULT_LOOK.hairColor
      : look.hairColor,
    lips: locked(look.lips, wardrobe) ? DEFAULT_LOOK.lips : look.lips,
    shadow: locked(look.shadow, wardrobe) ? DEFAULT_LOOK.shadow : look.shadow,
  };
}

/** The catalogue options the wardrobe can wear: free ones plus owned shop items. */
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
