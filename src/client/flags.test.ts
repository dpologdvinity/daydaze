import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTier, inviteLink, readFlags } from "./flags.ts";

const saveWith = (quality: string) =>
  JSON.stringify({ version: 1, settings: { quality } });

test("the boot tier is the ?quality flag first, then the saved setting", () => {
  assert.equal(bootTier("?quality=low", saveWith("high")), "low");
  assert.equal(bootTier("?quality=high", saveWith("low")), "high");
  assert.equal(bootTier("", saveWith("low")), "low");
});

test("no flag and an auto, missing or broken save leave the tier open", () => {
  assert.equal(bootTier("", saveWith("auto")), null);
  assert.equal(bootTier("", null), null);
  assert.equal(bootTier("?quality=ultra", "{not json"), null);
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
