import assert from "node:assert/strict";
import test from "node:test";
import { current, newSong, phrase, sing, SHELLS } from "./sirenSong.ts";

test("a song's phrase is the same every time and only grows", () => {
  assert.deepEqual(phrase(7, 5), phrase(7, 5));
  assert.deepEqual(phrase(7, 5).slice(0, 3), phrase(7, 3));
  assert.ok(phrase(7, 40).every((n) => n >= 0 && n < SHELLS));
  assert.equal(new Set(phrase(7, 40)).size, SHELLS);
});

test("singing a round back right asks for one more note", () => {
  let song = newSong(3);
  for (let round = 0; round < 4; round++) {
    const notes = current(song);
    assert.equal(notes.length, round + 1);
    notes.forEach((n, i) => {
      const r = sing(song, n);
      assert.equal(r.result, i === notes.length - 1 ? "round" : "note");
      song = r.song;
    });
  }
  assert.equal(song.rounds, 4);
});

test("a wrong note ends the song", () => {
  const song = newSong(3);
  const wrong = (current(song)[0] + 1) % SHELLS;
  const r = sing(song, wrong);
  assert.equal(r.result, "wrong");
  assert.equal(r.song.over, true);
  assert.equal(sing(r.song, current(song)[0]).result, "wrong");
});
