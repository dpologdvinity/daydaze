import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chart,
  LANES,
  NOTES,
  sing,
  songOver,
  songScore,
  type Song,
} from "./karaokeGame.ts";

test("a song is a seeded chart of notes, in time order, on the three lanes", () => {
  const a = chart(7);
  assert.equal(a.length, NOTES);
  assert.deepEqual(a, chart(7));
  assert.notDeepEqual(a, chart(8));
  for (let i = 1; i < a.length; i++) assert.ok(a[i]!.at > a[i - 1]!.at);
  assert.ok(a.every((n) => n.lane >= 0 && n.lane < LANES));
});

test("the right lane on time scores; the wrong lane or a miss doesn't", () => {
  let s: Song = [];
  s = sing(s, "perfect", true);
  s = sing(s, "good", true);
  s = sing(s, "perfect", false);
  s = sing(s, "late", true);
  assert.equal(songScore(s), 100 + 60);
});

test("the song ends after its last note, and nothing counts after", () => {
  let s: Song = [];
  for (let i = 0; i < NOTES; i++) s = sing(s, "perfect", true);
  assert.ok(songOver(s));
  assert.equal(sing(s, "perfect", true), s);
  assert.equal(songScore(s), NOTES * 100);
});
