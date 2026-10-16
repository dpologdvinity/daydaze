import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DELIVERY_SECONDS,
  deliveryProgress,
  isDelivered,
  placeOrder,
} from "./delivery.ts";
import { FOOD_VENUES } from "./venues.ts";

const item = FOOD_VENUES[0].menu[0].id;

test("an order needs a real menu item", () => {
  assert.equal(placeOrder("not-a-real-item", 0), undefined);
  const order = placeOrder(item, 1000);
  assert.ok(order);
  assert.equal(order.itemId, item);
  assert.equal(order.placedAt, 1000);
  assert.equal(order.dueAt, 1000 + DELIVERY_SECONDS * 1000);
});

test("a courier arrives after the timer and not before", () => {
  const order = placeOrder(item, 0);
  assert.ok(order);
  assert.equal(isDelivered(order, DELIVERY_SECONDS * 1000 - 1), false);
  assert.equal(isDelivered(order, DELIVERY_SECONDS * 1000), true);
});

test("progress runs from 0 to 1 and stays inside that range", () => {
  const order = placeOrder(item, 0);
  assert.ok(order);
  assert.equal(deliveryProgress(order, -500), 0);
  assert.equal(deliveryProgress(order, DELIVERY_SECONDS * 500), 0.5);
  assert.equal(deliveryProgress(order, DELIVERY_SECONDS * 5000), 1);
});
