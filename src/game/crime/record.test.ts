import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CRIME,
  isBanned,
  recordCaught,
  validateCrime,
} from "./record.ts";

test("a warning bans that store until the ban ends", () => {
  const now = 5_000;
  const crime = recordCaught(DEFAULT_CRIME, "bodega", now, {
    kind: "warning",
    banMs: 1_000,
  });
  assert.equal(crime.offences, 1);
  assert.equal(isBanned(crime, "bodega", now), true);
  assert.equal(isBanned(crime, "bodega", now + 1_000), false);
  assert.equal(isBanned(crime, "mall", now), false);
});

test("a fine or a jail term counts the offence without a store ban", () => {
  const crime = recordCaught(DEFAULT_CRIME, "mall", 0, {
    kind: "fine",
    coins: 10,
  });
  assert.equal(crime.offences, 1);
  assert.deepEqual(crime.bans, {});
});

test("saved crime data keeps good values and drops bad ones", () => {
  assert.deepEqual(validateCrime(undefined), DEFAULT_CRIME);
  assert.deepEqual(
    validateCrime({
      offences: 2,
      bans: { bodega: 9, mall: "soon", x: Infinity },
    }),
    { offences: 2, bans: { bodega: 9 }, stolen: {} },
  );
  assert.equal(validateCrime({ offences: -4 }).offences, 0);
  assert.equal(validateCrime({ offences: 1.5 }).offences, 0);
});
