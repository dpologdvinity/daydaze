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
