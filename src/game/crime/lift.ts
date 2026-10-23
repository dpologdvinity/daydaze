// Shoplifting in the real shops: which stealth profile (shoplift.ts) each
// shop counter has, the "stolen" tag on what you get away with, and staff
// who know their own stock when they see you wearing it. Hair at the salon is
// a service, so there's nothing there to pocket.
import type { Look } from "../look.ts";
import { itemsIn, wearItem, type ShopId, type ShopItem } from "../shop.ts";
import type { CrimeSave } from "./record.ts";
import { START, STORES, type Stealth, type Store } from "./shoplift.ts";

const LIFT_STORES: Partial<Record<ShopId, Store["id"]>> = {
  thrift: "thrift-store",
  beauty: "drugstore",
  boutique: "designer-boutique",
  piercing: "jewelry",
  shoes: "mall",
};

/** The stealth profile behind a shop's counter, or null if it can't be lifted from. */
export function liftStore(shop: ShopId): Store | null {
  const id = LIFT_STORES[shop];
  return STORES.find((s) => s.id === id) ?? null;
}

/** Got away with it: the item is yours, tagged with where it came from. */
export function tagStolen(
  crime: CrimeSave,
  itemId: string,
  storeId: string,
): CrimeSave {
  return { ...crime, stolen: { ...crime.stolen, [itemId]: storeId } };
}

const wearing = (look: Look, item: ShopItem) =>
  JSON.stringify(wearItem(look, item)) === JSON.stringify(look);

/** Something you're wearing that was lifted from this shop, if any. */
export function recognized(
  crime: CrimeSave,
  look: Look,
  shop: ShopId,
  day = 0,
): ShopItem | null {
  const store = liftStore(shop);
  if (!store) return null;
  return (
    itemsIn(shop, day).find(
      (item) => crime.stolen[item.id] === store.id && wearing(look, item),
    ) ?? null
  );
}

/** Staff who've spotted their own stock on you are watching from the start. */
export const RECOGNIZED_SUSPICION = 50;

export const startLift = (known: boolean): Stealth =>
  known ? { ...START, suspicion: RECOGNIZED_SUSPICION } : START;
