import assert from "node:assert/strict";
import { test } from "node:test";
import { bootTier } from "./flags.ts";

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
