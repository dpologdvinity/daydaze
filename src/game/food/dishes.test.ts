// The Filipino dish catalog: each dish has its Meshy model file and a sane size.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { DISHES, dishUrl, isDishId, type DishId } from "./dishes.ts";

test("every dish has a model file and a table-sized fit box", () => {
  for (const id of Object.keys(DISHES) as DishId[]) {
    assert.ok(existsSync(`public${dishUrl(id)}`), `${id}.glb`);
    const { width, height } = DISHES[id];
    assert.ok(width >= 0.1 && width <= 1, `${id} width`);
    assert.ok(height >= 0.08 && height <= 0.5, `${id} height`);
  }
});

test("the mango drinks and desserts load from the mango folder", () => {
  assert.equal(dishUrl("mango-shake"), "/models/meshy/mango/mango-shake.glb");
  assert.equal(dishUrl("adobo"), "/models/meshy/food/adobo.glb");
});

test("isDishId tells a dish from a Quaternius model name", () => {
  assert.ok(isDishId("adobo"));
  assert.ok(!isDishId("food-ChickenLeg"));
  assert.ok(!isDishId("toString"));
});
