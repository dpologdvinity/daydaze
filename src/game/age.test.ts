import { test } from "node:test";
import assert from "node:assert/strict";
import { ADULT_ROOMS, mayEnter } from "./age.ts";

test("18+ rooms are shut without the age check; the rest are open", () => {
  assert.ok(ADULT_ROOMS.has("green-haze"));
  assert.equal(mayEnter("green-haze", false), false);
  assert.equal(mayEnter("green-haze", true), true);
  assert.equal(mayEnter("velvet-room", false), true);
});
