// Ambience follows the active room, district, and the city's own daylight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ambienceFor } from "./ambience.ts";

test("city ambience follows daylight and beachside", () => {
  assert.deepEqual(ambienceFor("city", "downtown", 12), {
    "city-day": 0.3,
    "city-night": 0,
  });
  assert.deepEqual(ambienceFor("city", "downtown", 0), {
    "city-day": 0,
    "city-night": 0.3,
  });
  const dusk = ambienceFor("city", "downtown", 19.5);
  assert.equal(dusk["city-day"], 0.15);
  assert.equal(dusk["city-night"], 0.15);
  assert.deepEqual(ambienceFor("city", "beachside", 12), { beach: 0.3 });
});
test("rooms select only their own ambience", () => {
  assert.deepEqual(ambienceFor("stadium", "downtown", 12), { stadium: 0.3 });
  assert.deepEqual(ambienceFor("plaza", "downtown", 12), { fountain: 0.3 });
  assert.deepEqual(ambienceFor("apartment", "downtown", 12), {});
});
