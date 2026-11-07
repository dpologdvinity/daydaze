import assert from "node:assert/strict";
import { test } from "node:test";
import { MOVING, clipOf } from "./clips.ts";
import { pickTransition, postureOf } from "./transitions.ts";

test("posture: moving beats mood, sitting needs the Sit mood or a wheelchair", () => {
  assert.equal(postureOf({ speed: 0, mood: "idle" }), "stand");
  assert.equal(postureOf({ speed: 0, mood: "dance" }), "stand");
  assert.equal(postureOf({ speed: 0, mood: "sit" }), "sit");
  assert.equal(postureOf({ speed: MOVING + 0.1, mood: "sit" }), "move");
  assert.equal(postureOf({ speed: MOVING, mood: "idle" }), "stand");
  assert.equal(postureOf({ speed: 1, mood: "idle", seated: true }), "sit");
  // a swimmer is neither sitting nor walking
  assert.equal(postureOf({ speed: 1, mood: "sit", afloat: true }), "stand");
});

test("sitting down and standing up each have a baked one-shot", () => {
  const down = pickTransition("stand", "sit", 0);
  assert.equal(down?.id, "sit-down");
  assert.equal(clipOf(down?.id)?.kind, "trans");
  assert.equal(down?.pack, "seated");
  assert.ok((down?.seconds ?? 0) > 0.5);
  // a row of people doesn't all sit down the same way
  const downs = new Set(
    Array.from({ length: 6 }, (_, s) => pickTransition("stand", "sit", s)?.id),
  );
  assert.ok(downs.size > 1);
  for (const id of downs) assert.equal(clipOf(id)?.kind, "trans", String(id));
  const up = pickTransition("sit", "stand", 3);
  assert.equal(up?.id, "stand-up-ual");
  assert.equal(clipOf(up?.id)?.kind, "trans");
  // quick enough for a game: a second or two, not a cutscene
  assert.ok((up?.seconds ?? 99) < 2.5);
});

test("no transition for the same posture or when a walk takes over", () => {
  for (const p of ["stand", "sit", "move"] as const)
    assert.equal(pickTransition(p, p, 0), null);
  assert.equal(pickTransition("sit", "move", 0), null);
  assert.equal(pickTransition("move", "sit", 0), null);
  assert.equal(pickTransition("move", "stand", 0), null);
  assert.equal(pickTransition("stand", "move", 0), null);
});
