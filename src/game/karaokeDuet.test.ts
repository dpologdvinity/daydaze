import assert from "node:assert/strict";
import { test } from "node:test";
import { NOTES, type Song } from "./karaokeGame.ts";
import {
  DUET_LINE,
  duetTurn,
  encodeDuet,
  parseDuetMessage,
  partScore,
} from "./karaokeDuet.ts";

test("a duet trades lines: the asker sings the first, the partner the next", () => {
  assert.equal(DUET_LINE, 4);
  const turns = Array.from({ length: NOTES }, (_, i) => duetTurn(i));
  assert.deepEqual(turns.slice(0, 8), [
    "lead",
    "lead",
    "lead",
    "lead",
    "follow",
    "follow",
    "follow",
    "follow",
  ]);
  // an even split of the song
  assert.equal(turns.filter((t) => t === "lead").length, NOTES / 2);
});

test("each singer's part counts only their own lines", () => {
  const song: Song = Array.from({ length: NOTES }, (_, i) => ({
    swing: i < 4 ? "perfect" : "good",
    lane: true,
  }));
  // lead: 4 perfect (lines 1) + 4 good (line 3); follow: 8 good
  assert.equal(partScore(song, "lead"), 4 * 100 + 4 * 60);
  assert.equal(partScore(song, "follow"), 8 * 60);
});

test("duet messages round-trip; bad ones are dropped", () => {
  for (const m of [
    { k: "duet-ask", seed: 12345 },
    { k: "duet-yes" },
    { k: "duet-no" },
    { k: "duet-done", score: 780 },
  ] as const)
    assert.deepEqual(parseDuetMessage(encodeDuet(m)), m);
  for (const bad of [
    { k: "duet-ask", seed: -1 },
    { k: "duet-ask", seed: 1.5 },
    { k: "duet-done", score: 99999 },
    { k: "duet-done" },
    { k: "duet-boo" },
  ])
    assert.equal(parseDuetMessage(JSON.stringify(bad)), null);
});
