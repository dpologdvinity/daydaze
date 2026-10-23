import assert from "node:assert/strict";
import { test } from "node:test";
import { buzzTier, decodeAction, encodeAction } from "./peerAction.ts";

test("a dance goes out with its move, other moods plain", () => {
  assert.equal(encodeAction("dance", "salsa"), "dance:salsa");
  assert.equal(encodeAction("idle", "salsa"), "idle");
  assert.deepEqual(decodeAction("dance:salsa"), {
    mood: "dance",
    dance: "salsa",
  });
  assert.deepEqual(decodeAction("sit"), { mood: "sit" });
});

test("anything unknown comes back safe", () => {
  assert.deepEqual(decodeAction("dance:moonwalk-9000"), { mood: "dance" });
  assert.deepEqual(decodeAction("flying"), { mood: "idle" });
  assert.ok(encodeAction("dance", "salsa").length <= 24);
});

test("a seated player goes out with their height, lying or sitting", () => {
  const a = encodeAction("idle", "salsa", { pose: "sit", y: 0.38 });
  assert.equal(a, "sit@38");
  assert.deepEqual(decodeAction(a), {
    mood: "sit",
    seat: { pose: "sit", y: 0.38 },
  });
  assert.deepEqual(decodeAction("lay@60").seat, { pose: "lie", y: 0.6 });
  // standing in a ride's car, up the wheel
  assert.equal(
    encodeAction("dance", "salsa", { pose: "stand", y: 14.2 }),
    "up@1420",
  );
  assert.deepEqual(decodeAction("up@1420"), {
    mood: "idle",
    seat: { pose: "stand", y: 14.2 },
  });
  assert.deepEqual(decodeAction("sit@abc"), { mood: "idle" });
});

test("a driver goes out as their car and its paint", () => {
  const a = encodeAction("dance", "salsa", undefined, {
    id: "nova-spyder",
    color: "#FF4FB3",
  });
  assert.equal(a, "c:ff4fb3000nova-spyder");
  assert.ok(a.length <= 24);
  assert.deepEqual(decodeAction(a), {
    mood: "idle",
    car: { id: "nova-spyder", color: "#ff4fb3", mods: {} },
  });
  // a car no one sells, or a paint that isn't one, draws no car
  assert.deepEqual(decodeAction("c:ff4fb3000tank"), { mood: "idle" });
  assert.deepEqual(decodeAction("c:red000pebble"), { mood: "idle" });
});

test("a driver's rims, underglow and tint go along", () => {
  const mods = { rims: "gold", glow: "cyan", tint: "limo" };
  const a = encodeAction(
    "idle",
    "salsa",
    undefined,
    {
      id: "nova-spyder",
      color: "#ff4fb3",
      mods,
    },
    3,
  );
  assert.equal(a, "c:ff4fb3222nova-spyder~3");
  assert.ok(a.length <= 24);
  assert.deepEqual(decodeAction(a).car?.mods, mods);
  // a mod index past the list is the stock part
  assert.deepEqual(decodeAction("c:ff4fb3990pebble").car?.mods, {});
});

test("a buzz rides along on any action, and still fits", () => {
  assert.equal(buzzTier(0.1), 0);
  assert.equal(buzzTier(0.5), 2);
  assert.equal(buzzTier(1), 3);
  assert.equal(encodeAction("idle", "salsa", undefined, undefined, 0), "idle");
  const a = encodeAction("dance", "salsa", undefined, undefined, 2);
  assert.equal(a, "dance:salsa~2");
  assert.deepEqual(decodeAction(a), { mood: "dance", dance: "salsa", buzz: 2 });
  const driving = encodeAction(
    "idle",
    "salsa",
    undefined,
    { id: "nova-spyder", color: "#ff4fb3" },
    3,
  );
  assert.ok(driving.length <= 24);
  assert.equal(decodeAction(driving).car?.id, "nova-spyder");
  assert.equal(decodeAction(driving).buzz, 3);
  assert.deepEqual(decodeAction("idle~9"), { mood: "idle" });
});
