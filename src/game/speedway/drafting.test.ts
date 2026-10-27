// Tests for Speedway drafting mechanics.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CarSpec, CarState } from "../driving/car.ts";
import {
  calcDraft,
  applyDraftBonus,
  DRAFT_MAX_DIST,
  DRAFT_MIN_DIST,
} from "./drafting.ts";

test("cars with zero speed get no draft", () => {
  const trailer: CarState = { position: [0, 0], yaw: 0, speed: 0 };
  const leader: CarState = { position: [0, 8], yaw: 0, speed: 0 };
  assert.equal(calcDraft(trailer, [leader]), 0);
});

test("a car trailing directly behind a fast leader gets draft bonus", () => {
  // yaw 0 faces +z; trailer at [0, 0], leader at [0, 8] is 8m ahead in +z
  const trailer: CarState = { position: [0, 0], yaw: 0, speed: 25 };
  const leader: CarState = { position: [0, 8], yaw: 0, speed: 25 };
  const draft = calcDraft(trailer, [leader]);
  assert.ok(draft > 0 && draft <= 1);
});

test("closer distance gives stronger draft", () => {
  const trailer: CarState = { position: [0, 0], yaw: 0, speed: 25 };
  const closeLeader: CarState = { position: [0, 5], yaw: 0, speed: 25 };
  const farLeader: CarState = { position: [0, 15], yaw: 0, speed: 25 };
  const closeDraft = calcDraft(trailer, [closeLeader]);
  const farDraft = calcDraft(trailer, [farLeader]);
  assert.ok(closeDraft > farDraft);
});

test("a car beyond max draft distance gets zero draft", () => {
  const trailer: CarState = { position: [0, 0], yaw: 0, speed: 25 };
  const farLeader: CarState = {
    position: [0, DRAFT_MAX_DIST + 5],
    yaw: 0,
    speed: 25,
  };
  assert.equal(calcDraft(trailer, [farLeader]), 0);
});

test("a car too close (under min dist) or behind gets zero draft", () => {
  const trailer: CarState = { position: [0, 10], yaw: 0, speed: 25 };
  const behind: CarState = { position: [0, 0], yaw: 0, speed: 25 };
  assert.equal(calcDraft(trailer, [behind]), 0);

  const tooClose: CarState = {
    position: [0, 10 + DRAFT_MIN_DIST * 0.5],
    yaw: 0,
    speed: 25,
  };
  assert.equal(calcDraft(trailer, [tooClose]), 0);
});

test("lateral offset outside the slipstream wake gets zero draft", () => {
  const trailer: CarState = { position: [0, 0], yaw: 0, speed: 25 };
  const wideLeader: CarState = { position: [5, 8], yaw: 0, speed: 25 };
  assert.equal(calcDraft(trailer, [wideLeader]), 0);
});

test("applyDraftBonus boosts top speed and acceleration proportionally", () => {
  const baseSpec: CarSpec = {
    id: "test-car",
    name: "Test Car",
    basedOn: "stock",
    class: "sports",
    topSpeed: 50,
    accel: 10,
    brake: 15,
    turnRate: 1.5,
    grip: 0.9,
    length: 4.5,
    width: 1.8,
    seats: 1,
    price: 1000,
  };
  const boosted = applyDraftBonus(baseSpec, 0.8);
  assert.ok(boosted.topSpeed > baseSpec.topSpeed);
  assert.ok(boosted.accel > baseSpec.accel);
  assert.equal(boosted.brake, baseSpec.brake);
});
