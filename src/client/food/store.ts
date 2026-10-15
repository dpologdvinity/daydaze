// The food the local doll holds, and the delivery orders in flight. In memory
// only, like the buzz: a reload empties the tray and cancels the couriers.
import {
  isDelivered,
  placeOrder,
  type Order,
} from "../../game/food/delivery.ts";
import { menuItemById, type MenuItem } from "../../game/food/venues.ts";
import { relieve } from "../effects/drunk.ts";

export type FoodState = {
  held: MenuItem | null;
  orders: readonly Order[];
  /** The courier's last news, read by the live region, or null. */
  toast: string | null;
};

let state: FoodState = { held: null, orders: [], toast: null };
const listeners = new Set<() => void>();

function set(next: FoodState): void {
  state = next;
  for (const listen of listeners) listen();
}

export function getFoodState(): FoodState {
  return state;
}

export function onFoodChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hands the doll a menu item to hold; a held item is replaced. */
export function holdItem(item: MenuItem): void {
  set({ ...state, held: item, toast: null });
}

/** Eats or sips the held item and empties the tray. */
export function eatHeld(): void {
  const held = state.held;
  if (!held) return;
  relieve(held.kind);
  set({ ...state, held: null });
}

/** Places an order for a menu item; unknown items are ignored. */
export function orderItem(itemId: string, now: number): void {
  const order = placeOrder(itemId, now);
  if (!order) return;
  set({ ...state, orders: [...state.orders, order] });
}

/** Lands every due courier: the item goes in the doll's hands, with a toast. */
export function tickDeliveries(now: number): void {
  const due = state.orders.filter((order) => isDelivered(order, now));
  if (due.length === 0) return;
  let held = state.held;
  let toast = state.toast;
  for (const order of due) {
    const found = menuItemById(order.itemId);
    if (!found) continue;
    held = found.item;
    toast = `The courier dropped off ${found.item.name}.`;
  }
  set({
    held,
    toast,
    orders: state.orders.filter((order) => !due.includes(order)),
  });
}

export function clearToast(): void {
  if (state.toast !== null) set({ ...state, toast: null });
}

export function resetFood(): void {
  set({ held: null, orders: [], toast: null });
}
