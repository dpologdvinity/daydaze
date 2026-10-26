import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeRide,
  parseRideMessage,
  passengerSeat,
  stepOut,
} from "./passenger.ts";

test("ride messages round-trip; anything else is dropped", () => {
  for (const m of [
    { k: "ride-offer" },
    { k: "ride-accept" },
    { k: "ride-stop" },
  ] as const)
    assert.deepEqual(parseRideMessage(encodeRide(m)), m);
  for (const bad of ['{"k":"ride-steal"}', "null", "{oops", "x".repeat(5000)])
    assert.equal(parseRideMessage(bad), null);
});

const near = (a: readonly number[], b: readonly number[]) =>
  a.every((v, i) => Math.abs(v - (b[i] ?? NaN)) < 1e-9);

test("the passenger sits beside the driver, on the car's right", () => {
  // facing +z, the right is -x
  assert.ok(near(passengerSeat(10, 20, 0), [9.6, 20]));
  // a quarter turn (facing +x): the right is +z, turning with the car
  assert.ok(near(passengerSeat(0, 0, Math.PI / 2), [0, 0.4]));
});

test("getting out puts the passenger on the pavement beside the door", () => {
  assert.ok(near(stepOut(10, 20, 0), [8.4, 20]));
});
