import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LOOK } from "../look.ts";
import { wearItem, itemsIn } from "../shop.ts";
import { DEFAULT_CRIME, validateCrime } from "./record.ts";
import { liftStore, recognized, startLift, tagStolen } from "./lift.ts";

test("each shop counter has a stealth profile, except the salon's services", () => {
  assert.equal(liftStore("thrift")?.difficulty, "easy");
  assert.equal(liftStore("boutique")?.difficulty, "hard");
  assert.equal(liftStore("piercing")?.consequence, "jail");
  assert.equal(liftStore("salon"), null);
});

test("lifted stock is tagged, and its shop knows it when you wear it", () => {
  const item = itemsIn("boutique").find((i) => i.slot === "outfit");
  assert.ok(item);
  const crime = tagStolen(DEFAULT_CRIME, item.id, "designer-boutique");
  const dressed = wearItem(DEFAULT_LOOK, item);
  assert.equal(recognized(crime, dressed, "boutique")?.id, item.id);
  // not worn, or worn into another shop: nobody minds
  assert.equal(recognized(crime, DEFAULT_LOOK, "boutique"), null);
  assert.equal(recognized(crime, dressed, "thrift"), null);
  assert.ok(startLift(true).suspicion > startLift(false).suspicion);
});

test("the stolen tags survive a save, and junk in them doesn't", () => {
  const saved = JSON.parse(
    JSON.stringify({
      offences: 1,
      bans: {},
      stolen: { "sequin-slip": "designer-boutique", bad: 4 },
    }),
  );
  assert.deepEqual(validateCrime(saved).stolen, {
    "sequin-slip": "designer-boutique",
  });
  assert.deepEqual(validateCrime({ offences: 0, bans: {} }).stolen, {});
});
