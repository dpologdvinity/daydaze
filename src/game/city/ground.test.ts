import { test } from "node:test";
import assert from "node:assert/strict";
import { groundAt } from "./ground.ts";
import { BOARDWALK, PARK, WATER_Z } from "./layout.ts";

test("the boardwalk is wood, the beach sand, the lawn grass, the rest pavement", () => {
  const mid = (BOARDWALK.z0 + BOARDWALK.z1) / 2;
  assert.equal(groundAt(0, mid), "wood");
  assert.equal(groundAt(0, (BOARDWALK.z1 + WATER_Z) / 2), "sand");
  assert.equal(
    groundAt((PARK.x0 + PARK.x1) / 2, (PARK.z0 + PARK.z1) / 2),
    "grass",
  );
  assert.equal(groundAt(0, 0), "pavement");
});
