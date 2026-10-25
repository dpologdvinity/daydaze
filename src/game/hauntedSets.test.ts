// Tests for the haunted escape's rooms: each depth is its own set, and each
// wrong door picks a scare to play in it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPTH } from "./hauntedRun.ts";
import { ROOM_SETS, roomSet, SCARES, scareFor } from "./hauntedSets.ts";

test("every depth of a run is a set, never the same one twice in a row", () => {
  for (const seed of [1, 7, 42, 999]) {
    let last = "";
    for (let d = 0; d < DEPTH; d++) {
      const set = roomSet(seed, d);
      assert.ok(ROOM_SETS.includes(set));
      assert.notEqual(set, last, `seed ${seed} depth ${d}`);
      last = set;
    }
    assert.equal(roomSet(seed, 3), roomSet(seed, 3));
  }
});

test("a run walks through at least five different sets", () => {
  const seen = new Set(Array.from({ length: DEPTH }, (_, d) => roomSet(5, d)));
  assert.ok(seen.size >= 5);
});

test("each wrong door picks a scare, with its line, never gore", () => {
  const kinds = new Set<string>();
  for (let d = 0; d < DEPTH; d++)
    for (let nerve = 1; nerve <= 3; nerve++) {
      const s = scareFor(11, d, nerve);
      assert.ok(SCARES.some((x) => x.kind === s.kind));
      assert.ok(s.line.length > 10);
      kinds.add(s.kind);
    }
  assert.ok(kinds.size >= 3);
  for (const s of SCARES)
    assert.doesNotMatch(s.line, /blood|gore|dead|corpse/i);
});
