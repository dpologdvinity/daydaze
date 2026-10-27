import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adopt,
  canFeed,
  feed,
  followStep,
  happiness,
  moodOf,
  PERSONAL_SPACE,
  placeBeside,
  sleeping,
  STAY,
  TELEPORT_FROM,
  validatePet,
  type Follower,
} from "./pet.ts";

const free = () => false;
const you = { x: 0, z: 0, yaw: 0 };

test("adopting needs a valid name, and trims it", () => {
  assert.equal(adopt("husky", "x", 5), null);
  assert.equal(adopt("husky", "Bad!Name", 5), null);
  assert.deepEqual(adopt("cat", "  Mochi ", 5), {
    kind: "cat",
    name: "Mochi",
    adoptedAt: 5,
    fedAt: 5,
  });
});

test("a pet read from storage is checked field by field", () => {
  const ok = { kind: "rabbit", name: "Clover", adoptedAt: 10, fedAt: 20 };
  assert.deepEqual(validatePet(ok), ok);
  assert.equal(validatePet(null), null);
  assert.equal(validatePet({ ...ok, kind: "dragon" }), null);
  assert.equal(validatePet({ ...ok, name: "<b>" }), null);
  assert.equal(validatePet({ ...ok, adoptedAt: -1 }), null);
  // a missing feeding time falls back to the adoption time
  assert.equal(validatePet({ ...ok, fedAt: "soon" })?.fedAt, 10);
});

test("a pet gets hungry over time and a treat fills it again", () => {
  const pet = adopt("cat", "Mochi", 0);
  assert.ok(pet);
  assert.equal(happiness(pet, 0), 100);
  assert.equal(moodOf(pet, 0), "happy");
  assert.equal(happiness(pet, 10 * 3_600_000), 10);
  assert.equal(moodOf(pet, 10 * 3_600_000), "hungry");
  assert.equal(canFeed(pet, 1000), false);
  assert.equal(feed(pet, 1000), pet);
  const hungry = feed(pet, 3_600_000);
  assert.equal(hungry.fedAt, 3_600_000);
});

test("the pet comes to you, walking near and running far", () => {
  const near = followStep(
    { x: 4, z: 0, yaw: 0, clip: "idle" },
    you,
    0.1,
    false,
    free,
  );
  assert.equal(near.clip, "walk");
  assert.ok(near.x < 4);
  const far = followStep(
    { x: 10, z: 0, yaw: 0, clip: "idle" },
    you,
    0.1,
    false,
    free,
  );
  assert.equal(far.clip, "run");
  assert.ok(10 - far.x > 4 - near.x);
});

test("beside you it stands, and sits when you sit", () => {
  const at = placeBeside(you);
  assert.equal(followStep(at, you, 0.1, false, free).clip, "idle");
  assert.equal(followStep(at, you, 0.1, true, free).clip, "sit");
});

test("it never walks through you", () => {
  let pet: Follower = { x: 0.2, z: 0.2, yaw: 0, clip: "idle" };
  for (let i = 0; i < 100; i++) {
    pet = followStep(pet, you, 0.05, false, free);
    // it started inside your space and must never step closer
    assert.ok(Math.hypot(pet.x, pet.z) >= Math.hypot(0.2, 0.2) - 1e-9);
  }
  let walker: Follower = { x: 3, z: 0, yaw: 0, clip: "idle" };
  for (let i = 0; i < 400; i++) {
    walker = followStep(walker, you, 0.05, false, free);
    assert.ok(Math.hypot(walker.x, walker.z) >= PERSONAL_SPACE - 1e-9);
  }
  // and it settles around STAY away
  assert.ok(Math.abs(Math.hypot(walker.x, walker.z) - STAY) < 0.6);
});

test("walls stop it, and being left far behind brings it to you", () => {
  const stuck = followStep(
    { x: 4, z: 0, yaw: 0, clip: "idle" },
    you,
    0.1,
    false,
    () => true,
  );
  assert.equal(stuck.x, 4);
  assert.equal(stuck.clip, "idle");
  const lost = followStep(
    { x: TELEPORT_FROM + 5, z: 0, yaw: 0, clip: "run" },
    you,
    0.1,
    false,
    free,
  );
  assert.ok(Math.hypot(lost.x, lost.z) < 3);
});

test("at home it sleeps until you come near, then sits up facing you", () => {
  const pet = placeBeside(you);
  assert.equal(sleeping(pet, { x: 20, z: 20 }, [1, 1]).clip, "sleep");
  assert.equal(sleeping(pet, { x: 1, z: 2 }, [1, 1]).clip, "sit");
});

test("a pet fed 'in the future' (a clock that ran ahead) is full, not over 100, and can be fed", () => {
  const now = 1_000_000_000;
  const pet = validatePet({
    kind: "cat",
    name: "Mochi",
    adoptedAt: now,
    fedAt: now + 3 * 86_400_000,
  });
  assert.ok(pet);
  assert.equal(happiness(pet, now), 100);
  assert.equal(moodOf(pet, now), "happy");
  // the treat resets the clock to now, so hunger counts from here again
  assert.equal(canFeed(pet, now), true);
  assert.equal(feed(pet, now).fedAt, now);
});
