import type { ShopId } from "../../game/shop.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Which shop's counter is open: a clerk's tap opens it, the panel closes it. */
export const shopRequest = createStore({
  open: null as ShopId | null,
  name: "",
});

export function openShop(open: ShopId, name: string) {
  shopRequest.set({ open, name });
}

export function closeShop() {
  shopRequest.set({ open: null, name: "" });
}
