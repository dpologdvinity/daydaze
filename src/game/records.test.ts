import { test } from "node:test";
import assert from "node:assert/strict";
import { buyRecord, cleanRecords, RECORD_PRICE } from "./records.ts";

test("a saved crate keeps real tracks only, once each", () => {
  assert.deepEqual(cleanRecords(["roller-disco", "roller-disco", "polka", 3]), [
    "roller-disco",
  ]);
  assert.deepEqual(cleanRecords("x"), []);
});

test("buying a record takes its price and adds it once", () => {
  assert.deepEqual(buyRecord(100, [], "la-noche-salsa"), {
    ok: true,
    coins: 100 - RECORD_PRICE,
    records: ["la-noche-salsa"],
  });
  assert.deepEqual(buyRecord(100, ["la-noche-salsa"], "la-noche-salsa"), {
    ok: false,
    reason: "owned",
  });
  assert.deepEqual(buyRecord(10, [], "roller-disco"), {
    ok: false,
    reason: "coins",
  });
  assert.deepEqual(buyRecord(100, [], "polka"), {
    ok: false,
    reason: "unknown",
  });
});
