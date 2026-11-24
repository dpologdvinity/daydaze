// URL flags: the boot quality tier (flag, then saved setting), ?join=<room>.<copy>
// parsing, invite links, and ?spot=<building> spawns in the city.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spotFor } from "../game/city/spots.ts";
import { bootTier, inviteLink, locationSearch, readFlags } from "./flags.ts";

const saveWith = (quality: string) =>
  JSON.stringify({ version: 1, settings: { quality } });

test("the boot tier is the ?quality flag first, then the saved setting", () => {
  assert.equal(bootTier("?quality=low", saveWith("high")), "low");
  assert.equal(bootTier("?quality=high", saveWith("low")), "high");
  assert.equal(bootTier("", saveWith("low")), "low");
  assert.equal(bootTier("?quality=ultra", saveWith("low")), "ultra");
});

test("the boot tier follows a saved Graphics menu choice", () => {
  const graphics = (preset: string) =>
    JSON.stringify({ version: 1, settings: { graphics: { preset } } });
  assert.equal(bootTier("", graphics("realistic")), "ultra");
  assert.equal(bootTier("", graphics("performance")), "low");
  assert.equal(bootTier("", graphics("auto")), null);
});

test("no flag and an auto, missing or broken save leave the tier open", () => {
  assert.equal(bootTier("", saveWith("auto")), null);
  assert.equal(bootTier("", null), null);
  assert.equal(bootTier("?quality=extreme", "{not json"), null);
});

test("?join=<room>.<copy> names a friend's room copy", () => {
  assert.deepEqual(readFlags("?join=karaoke.3").join, {
    room: "karaoke",
    copy: 3,
  });
  assert.deepEqual(readFlags("?join=water-park.12").join, {
    room: "water-park",
    copy: 12,
  });
});

test("a bad, private or out-of-range ?join is ignored", () => {
  for (const bad of [
    "",
    "?join=karaoke",
    "?join=nowhere.2",
    "?join=karaoke.0",
    "?join=karaoke.100",
    "?join=karaoke.2.5",
    "?join=karaoke.x",
    "?join=apartment.1",
  ])
    assert.equal(readFlags(bad).join, null, bad);
});

test("an invite link points at the room copy", () => {
  assert.equal(
    inviteLink("https://daydaze.example", "karaoke", 3),
    "https://daydaze.example/?join=karaoke.3",
  );
});

test("?spot=<building> starts in the city in front of it; ?yaw still turns", () => {
  const flags = readFlags("?spot=pulse&room=plaza");
  assert.equal(flags.room, "city");
  assert.deepEqual(flags.at, spotFor("pulse"));
  assert.equal(readFlags("?spot=pulse&yaw=1.5").at?.yaw, 1.5);
  // an unknown building leaves room and spot alone
  assert.equal(readFlags("?spot=nowhere").at, null);
  assert.equal(readFlags("?spot=nowhere").room, null);
});

test("?fov, ?dist, ?pitch, ?height parse numeric camera overrides", () => {
  const f = readFlags("?fov=60&dist=12.5&pitch=15&height=2.8");
  assert.equal(f.fov, 60);
  assert.equal(f.dist, 12.5);
  assert.equal(f.pitch, 15);
  assert.equal(f.height, 2.8);
});

test("invalid or out-of-range camera flags fall back to null", () => {
  const f = readFlags("?fov=5&dist=-2&pitch=120&height=100");
  assert.equal(f.fov, null);
  assert.equal(f.dist, null);
  assert.equal(f.pitch, null);
  assert.equal(f.height, null);

  const fNaN = readFlags("?fov=wide&dist=far&pitch=up&height=high");
  assert.equal(fNaN.fov, null);
  assert.equal(fNaN.dist, null);
  assert.equal(fNaN.pitch, null);
  assert.equal(fNaN.height, null);
});

test("?cam= parses 3 relative or 6 world coordinates", () => {
  const rel = readFlags("?cam=0,1.5,-2.4");
  assert.deepEqual(rel.cam, {
    kind: "relative",
    off: [0, 1.5, -2.4],
  });

  const world = readFlags("?cam=6.4,5.4,10,0.6,1.0,-1.0");
  assert.deepEqual(world.cam, {
    kind: "world",
    eye: [6.4, 5.4, 10],
    look: [0.6, 1.0, -1.0],
  });

  assert.equal(readFlags("?cam=1,2").cam, null);
  assert.equal(readFlags("?cam=1,2,3,4").cam, null);
  assert.equal(readFlags("?cam=1,2,a").cam, null);
});

test("?heistend= parses caught or escape, falls back to null", () => {
  assert.equal(readFlags("?heistend=caught").heistend, "caught");
  assert.equal(readFlags("?heistend=escape").heistend, "escape");
  assert.equal(readFlags("?heistend=other").heistend, null);
  assert.equal(readFlags("").heistend, null);
});

test("locationSearch returns empty string in Node environment without location", () => {
  assert.equal(typeof location, "undefined");
  assert.equal(locationSearch(), "");
});

test("readFlags defaults to locationSearch() and returns default flags in Node", () => {
  assert.equal(typeof location, "undefined");
  const flags = readFlags();
  assert.equal(flags.quality, null);
  assert.equal(flags.still, false);
  assert.equal(flags.debug, false);
  assert.equal(flags.room, null);
  assert.equal(flags.adult, false);
  assert.equal(flags.join, null);
});
