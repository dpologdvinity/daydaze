import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearToast,
  eatHeld,
  getFoodState,
  holdItem,
  orderItem,
  resetFood,
  tickDeliveries,
} from "./store.ts";
import { addDrink, decayBuzz } from "../../game/effects/buzz.ts";
import { FOOD_VENUES } from "../../game/food/venues.ts";
import { DELIVERY_SECONDS } from "../../game/food/delivery.ts";
import { setActiveTier } from "../../game/age.ts";
import { getBuzz, drink } from "../effects/drunk.ts";

const item = FOOD_VENUES[0].menu[0];

test("a held item is replaced, and eating empties the tray and lowers the buzz", () => {
  resetFood();
  setActiveTier("adult"); // buzz exists only at 18+
  drink("cocktail");
  setActiveTier("teen");
  const before = getBuzz();
  holdItem(item);
  assert.equal(getFoodState().held, item);
  eatHeld();
  assert.equal(getFoodState().held, null);
  assert.ok(getBuzz() < before, "eating lowers the buzz");
  assert.ok(getBuzz() <= addDrink(0, "cocktail"));
  assert.equal(decayBuzz(0, 10), 0);
});

test("a delivery lands after the timer, puts the item in hand and toasts", () => {
  resetFood();
  orderItem(item.id, 0);
  orderItem("nope", 0);
  assert.equal(getFoodState().orders.length, 1);
  tickDeliveries(DELIVERY_SECONDS * 1000 - 1);
  assert.equal(getFoodState().held, null);
  tickDeliveries(DELIVERY_SECONDS * 1000);
  assert.equal(getFoodState().held, item);
  assert.equal(getFoodState().orders.length, 0);
  assert.match(getFoodState().toast ?? "", new RegExp(item.name));
  clearToast();
  assert.equal(getFoodState().toast, null);
  resetFood();
});
