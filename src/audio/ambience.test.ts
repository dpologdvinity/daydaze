// Ambience follows the active room, district, and the city's own daylight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ambienceFor, filesCover } from "./ambience.ts";

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
  assert.deepEqual(ambienceFor("city", "beachside", 12), {
    beach: 0.3,
    "music-boardwalk": 0.2,
  });
});
test("rooms select only their own ambience", () => {
  assert.deepEqual(ambienceFor("stadium", "downtown", 12), { stadium: 0.3 });
  assert.deepEqual(ambienceFor("plaza", "downtown", 12), { fountain: 0.3 });
  assert.deepEqual(ambienceFor("apartment", "downtown", 12), {});
});
test("music beds play only in their rooms", () => {
  assert.equal(ambienceFor("tiki-bar", "downtown", 12)["music-boardwalk"], 0.2);
  assert.equal(ambienceFor("city", "beachside", 12)["music-boardwalk"], 0.2);
  assert.equal(ambienceFor("violet-hour", "downtown", 12)["music-lounge"], 0.2);
  assert.equal(ambienceFor("city", "downtown", 12)["music-lounge"], undefined);
  assert.equal(
    ambienceFor("zoo", "downtown", 12)["music-boardwalk"],
    undefined,
  );
});

test("in Uptown's park the city hears birds and the fountain, and less traffic", () => {
  const park = ambienceFor("city", "uptown", 12, true);
  assert.equal(park.park, 0.3);
  assert.equal(park.fountain, 0.2);
  assert.ok(
    (park["city-day"] ?? 0) <
      (ambienceFor("city", "uptown", 12)["city-day"] ?? 0),
  );
  assert.equal(ambienceFor("city", "uptown", 12).park, undefined);
});

test("the synthesized bed stays on unless a sound file that plays covers the place", () => {
  const none = new Set<never>();
  // a room with no files keeps its synthesized bed
  assert.equal(filesCover({}, none), false);
  // the beach file covers the marina, until it fails to load or decode
  assert.equal(filesCover({ beach: 0.3 }, none), true);
  assert.equal(filesCover({ beach: 0.3 }, new Set(["beach"])), false);
  // a silent level covers nothing; a music bed alone is not ambience
  assert.equal(filesCover({ "city-night": 0 }, none), false);
  assert.equal(filesCover({ "music-lounge": 0.2 }, none), false);
  // the city at dusk: one of its two beds still plays
  assert.equal(
    filesCover({ "city-day": 0.1, "city-night": 0.2 }, new Set(["city-day"])),
    true,
  );
});
