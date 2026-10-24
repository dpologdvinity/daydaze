import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chart,
  LANES,
  NOTES,
  sing,
  songOver,
  songScore,
  streak,
  type Song,
} from "./karaokeGame.ts";

test("a song is a seeded chart of notes, in time order, on the three lanes", () => {
  const a = chart(7, 132, 10);
  assert.equal(a.length, NOTES);
  assert.deepEqual(a, chart(7, 132, 10));
  assert.notDeepEqual(a, chart(8, 132, 10));
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

test("every note lands on a beat of the backing track's tempo", () => {
  for (const bpm of [68, 118, 132, 190]) {
    const startAt = 3.217;
    const beat = 60 / bpm;
    // joined mid-track: the first note waits for the lead-in after `from`
    const from = startAt + 41.3;
    const notes = chart(5, bpm, startAt, from);
    assert.ok(notes[0]!.at >= from + 4 * beat - 1e-3, `${bpm}: lead-in`);
    for (const n of notes) {
      const beats = (n.at - startAt) / beat;
      assert.ok(Math.abs(beats - Math.round(beats)) * beat < 0.001, `${bpm}`);
      assert.equal(n.beat, Math.round(beats));
    }
  }
});

test("a streak counts the notes sung right in a row, back from the last", () => {
  let s: Song = [];
  assert.equal(streak(s), 0);
  s = sing(s, "perfect", true);
  s = sing(s, "good", true);
  assert.equal(streak(s), 2);
  s = sing(s, "late", true);
  assert.equal(streak(s), 0);
  s = sing(s, "perfect", false);
  s = sing(s, "perfect", true);
  assert.equal(streak(s), 1);
});
