// Delivery orders: a menu item, a clock and a courier timer. Pure, so the
// phone app and tests share one rule. The courier's arrival is the toast.
import { menuItemById } from "./venues.ts";

/** How long the courier takes, in seconds of real time. */
export const DELIVERY_SECONDS = 20;

export type Order = {
  id: string;
  itemId: string;
  placedAt: number;
  dueAt: number;
};

/** Starts an order for `itemId`, or returns undefined for an unknown item. */
export function placeOrder(itemId: string, now: number): Order | undefined {
  if (!menuItemById(itemId)) return undefined;
  return {
    id: `${itemId}@${now}`,
    itemId,
    placedAt: now,
    dueAt: now + DELIVERY_SECONDS * 1000,
  };
}

export function isDelivered(order: Order, now: number): boolean {
  return now >= order.dueAt;
}

/** 0 when placed, 1 once delivered, never outside that range. */
export function deliveryProgress(order: Order, now: number): number {
  const span = order.dueAt - order.placedAt;
  const done = (now - order.placedAt) / span;
  return Math.min(1, Math.max(0, done));
}
