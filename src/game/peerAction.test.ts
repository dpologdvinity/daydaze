import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAction, encodeAction } from "./peerAction.ts";

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
  const a = encodeAction("idle", "salsa", { lie: false, y: 0.38 });
  assert.equal(a, "sit@38");
  assert.deepEqual(decodeAction(a), {
    mood: "sit",
    seat: { lie: false, y: 0.38 },
  });
  assert.deepEqual(decodeAction("lay@60").seat, { lie: true, y: 0.6 });
  assert.deepEqual(decodeAction("sit@abc"), { mood: "idle" });
});
