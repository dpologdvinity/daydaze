import { test } from "node:test";
import assert from "node:assert/strict";
import { HEARING, loudness, nextDelay, pickCall } from "./zooSounds.ts";

test("calls are loud close up and gone past hearing range", () => {
  assert.equal(loudness(0), 1);
  assert.ok(loudness(6) > loudness(12));
  assert.equal(loudness(HEARING), 0);
  assert.equal(loudness(HEARING * 2), 0);
});

test("the wait between calls is 6 to 16 seconds", () => {
  assert.equal(nextDelay(0), 6);
  assert.equal(nextDelay(1), 16);
});

test("only animals with a recorded call speak, and only when near", () => {
  const near = [{ kind: "lion" as const, at: [2, 0] as const }];
  const call = pickCall([0, 0], near, 0.5);
  assert.equal(call?.id, "lion");
  assert.ok((call?.gain ?? 0) > 0.5);
  assert.equal(pickCall([0, 0], [{ kind: "giraffe", at: [1, 0] }], 0.5), null);
  for (const [kind, id] of [
    ["zebra", "zebra"],
    ["penguin", "penguin"],
    ["cow", "cow"],
    ["donkey", "donkey"],
  ] as const)
    assert.equal(pickCall([0, 0], [{ kind, at: [2, 0] }], 0.5)?.id, id);
  assert.equal(pickCall([0, 0], [{ kind: "lion", at: [40, 0] }], 0.5), null);
  assert.equal(pickCall([0, 0], [], 0.5), null);
  assert.equal(
    pickCall([0, 0], [{ kind: "flamingo", at: [3, 0] }], 0.99)?.id,
    "flamingos",
  );
});
