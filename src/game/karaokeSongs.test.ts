import assert from "node:assert/strict";
import { test } from "node:test";
import { LANES, LEAD_IN } from "./karaokeGame.ts";
import {
  GENRES,
  MAX_SONG_NOTES,
  SONGS,
  bandPlan,
  beatScale,
  parseMelody,
  songById,
  songChart,
} from "./karaokeSongs.ts";

test("a melody string reads as notes on beats, rests leaving gaps", () => {
  assert.deepEqual(parseMelody("C4/1 r/1 E4/0.5 F#4/0.5 Bb3/2"), [
    { beat: 0, midi: 60 },
    { beat: 2, midi: 64 },
    { beat: 2.5, midi: 66 },
    { beat: 3, midi: 58 },
  ]);
  assert.throws(() => parseMelody("H4/1"));
  assert.throws(() => parseMelody("C4/0"));
});

test("every song parses, has a unique id, and is singable", () => {
  const ids = new Set<string>();
  for (const song of SONGS) {
    assert.ok(!ids.has(song.id), `${song.id} twice`);
    ids.add(song.id);
    const notes = parseMelody(song.melody);
    assert.ok(notes.length >= 16, `${song.id}: ${notes.length} notes`);
    assert.ok(notes.length <= MAX_SONG_NOTES, song.id);
    for (const n of notes) assert.ok(n.midi >= 50 && n.midi <= 84, song.id);
  }
});

test("every genre in the songbook has songs", () => {
  for (const genre of GENRES)
    assert.ok(
      SONGS.some((s) => s.genre === genre),
      `no ${genre} song`,
    );
});

test("a song sings on the band's beat, at the multiple nearest its own tempo", () => {
  assert.equal(beatScale(108, 124), 1);
  assert.equal(beatScale(52, 124), 2);
  assert.equal(beatScale(168, 82), 0.5);
});

test("a song's chart follows its melody: rhythm on the band's beat, lanes by contour", () => {
  const song = songById("ode-to-joy");
  assert.ok(song);
  const span = 60 / 120;
  const notes = songChart(song, 120, 10, 10);
  const melody = parseMelody(song.melody);
  assert.equal(notes.length, melody.length);
  notes.forEach((n, i) => {
    const m = melody[i];
    assert.ok(m);
    assert.equal(n.pitch, m.midi);
    assert.ok(Math.abs(n.at - (10 + (LEAD_IN + m.beat) * span)) < 1e-9);
    assert.ok(n.lane >= 0 && n.lane < LANES);
  });
  // the lowest note (C4) is on the low lane, the highest (G4) on the high one
  const low = notes.find((n) => n.pitch === 60);
  const high = notes.find((n) => n.pitch === 67);
  assert.equal(low?.lane, 0);
  assert.equal(high?.lane, 2);
});

test("joining mid-track, the song starts on the band's next beat", () => {
  const song = songById("jingle-bells");
  assert.ok(song);
  // band started at 0 at 120 bpm (beat 0.5 s); now 3.2 s: next beat is 3.5
  const notes = songChart(song, 120, 0, 3.2);
  assert.ok(Math.abs((notes[0]?.at ?? 0) - (3.5 + LEAD_IN * 0.5)) < 1e-9);
});

test("the band harmonizes a song: its key from the melody, a chord per bar that fits", () => {
  const ode = songById("ode-to-joy");
  assert.ok(ode);
  const plan = bandPlan(ode);
  assert.equal(plan.tonic % 12, 0); // C major
  assert.equal(plan.minor, false);
  assert.equal(plan.beatsPerBar, 4);
  // bar 1 (E E F G) sits on C, bar 4 (E. D D) on G
  assert.deepEqual(plan.chords[0], [0, 4, 7]);
  assert.deepEqual(plan.chords[3], [7, 11, 2]);
  const green = songById("greensleeves");
  assert.ok(green);
  const minor = bandPlan(green);
  assert.equal(minor.tonic % 12, 9); // A minor
  assert.equal(minor.minor, true);
  for (const song of SONGS) {
    const p = bandPlan(song);
    assert.ok(p.chords.length >= 2, song.id);
    for (const c of p.chords) assert.equal(c.length, 3, song.id);
  }
});
