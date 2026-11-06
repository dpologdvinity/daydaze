import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAND,
  BLANKET_SEATS,
  CHAIRS,
  CROWD,
  FIRST_SET,
  LAST_SET,
  PROGRAMS,
  SET_EVERY,
  STAGE_BLANKETS,
  TUNE_GAP,
  bandAt,
  bandGain,
  bandHint,
  bandOnStage,
  clockLabel,
  programSeconds,
} from "./bandShell.ts";
import { arrange, tuneById } from "./bandTunes.ts";
import { bandPlan } from "../karaokeSongs.ts";
import { AUDIENCE, BAND_SHELL, PARK_BLOCKERS } from "./park.ts";

const H = 3600;

test("every program fits in its half hour and uses real songbook tunes", () => {
  assert.equal(PROGRAMS.length, 3);
  for (const program of PROGRAMS) {
    assert.equal(program.length, 4);
    assert.ok(
      programSeconds(program) < SET_EVERY - 300,
      `${programSeconds(program)} s`,
    );
    for (const tune of program) assert.ok(tune.seconds > 20, tune.song.id);
  }
});

test("the band plays at the top and the half hour, in tunes", () => {
  const first = PROGRAMS[0][0];
  const now = bandAt(FIRST_SET + 5);
  assert.ok(now.playing);
  assert.equal(now.tune.song.id, first.song.id);
  assert.equal(now.index, 0);
  assert.equal(now.into, 5);
  assert.equal(now.nextAt, FIRST_SET + SET_EVERY);
  // the second tune starts after the first's length and a gap
  const second = bandAt(FIRST_SET + first.seconds + TUNE_GAP + 2);
  assert.ok(second.playing);
  assert.equal(second.index, 1);
  assert.ok(Math.abs(second.into - 2) < 1e-9);
});

test("the quiet between tunes and sets is silent, with a next-set time", () => {
  const first = PROGRAMS[0][0];
  const gap = bandAt(FIRST_SET + first.seconds + 1);
  assert.equal(gap.playing, false);
  assert.equal(bandOnStage(gap), true);
  const rest = bandAt(FIRST_SET + SET_EVERY - 60);
  assert.equal(rest.playing, false);
  assert.equal(rest.nextAt, FIRST_SET + SET_EVERY);
  assert.equal(bandOnStage(rest), true, "tuning up before the set");
  const idle = bandAt(FIRST_SET + 12 * 60);
  assert.equal(idle.playing, false);
  assert.equal(bandOnStage(idle), false);
});

test("no music before the first set or after the last; the next day's is next", () => {
  const dawn = bandAt(7 * H);
  assert.equal(dawn.playing, false);
  assert.equal(dawn.nextAt, FIRST_SET);
  assert.equal(bandOnStage(dawn), false);
  const night = bandAt(LAST_SET + H);
  assert.equal(night.playing, false);
  assert.equal(night.nextAt, FIRST_SET + 86400);
  assert.equal(bandHint(night), "Next set at 10:00 AM");
  assert.ok(bandAt(LAST_SET + 5).playing, "the last set plays");
  const last = bandAt(LAST_SET + 5);
  assert.ok(last.playing && last.nextAt === null);
});

test("sets rotate through the programs", () => {
  const ids = [0, 1, 2, 3].map((i) => {
    const n = bandAt(FIRST_SET + i * SET_EVERY + 1);
    assert.ok(n.playing);
    return n.tune.song.id;
  });
  assert.equal(ids[0], ids[3]);
  assert.equal(new Set(ids).size, 3);
});

test("the hint names the tune or the next set, in 12-hour time", () => {
  assert.equal(clockLabel(14.5 * H), "2:30 PM");
  assert.equal(clockLabel(0), "12:00 AM");
  assert.equal(clockLabel(12 * H), "12:00 PM");
  assert.match(
    bandHint(bandAt(FIRST_SET + 5)),
    /^Now playing: .*\(next set at 10:30 AM\)$/,
  );
  assert.equal(bandHint(bandAt(FIRST_SET + 12 * 60)), "Next set at 10:30 AM");
});

test("a tune is arranged with a lead, a tuba and chords on the beat, in time", () => {
  const tune = tuneById("oh-susanna");
  const parts = new Set(tune.events.map((e) => e.part));
  for (const p of ["lead", "bass", "chord", "kick", "snare"] as const)
    assert.ok(parts.has(p), p);
  for (const e of tune.events) {
    assert.ok(e.beat >= 0 && e.beat < tune.beats, `${e.part} at ${e.beat}`);
    if (e.part === "lead") assert.ok(e.midi[0] >= 48 && e.midi[0] <= 96);
    if (e.part === "bass") assert.ok(e.midi[0] >= 36 && e.midi[0] < 48);
    if (e.part === "chord") assert.equal(e.midi.length, 3);
  }
  const sorted = [...tune.events].sort((a, b) => a.beat - b.beat);
  assert.deepEqual(tune.events, sorted);
  assert.ok(Math.abs(tune.seconds - (tune.beats * 60) / tune.song.bpm) < 1e-9);
  // a waltz puts the tuba on the downbeat only
  const waltz = arrange(tuneById("clementine").song);
  assert.ok(
    waltz.events
      .filter((e) => e.part === "bass")
      .every((e) => (e.beat - bandPlan(waltz.song).pickup) % 3 === 0),
  );
});

test("music fades with distance", () => {
  assert.equal(bandGain(0), 1);
  assert.equal(bandGain(12), 1);
  assert.ok(bandGain(30) > 0 && bandGain(30) < 1);
  assert.ok(bandGain(30) > bandGain(45));
  assert.equal(bandGain(60), 0);
  assert.equal(bandGain(500), 0);
});

test("the band, blankets and chairs sit on the lawn, clear of the shell", () => {
  assert.equal(BAND.length, 5);
  assert.equal(STAGE_BLANKETS.length, 5);
  assert.equal(BLANKET_SEATS.length, 5);
  assert.equal(CHAIRS.length, 11);
  for (const m of BAND) {
    assert.ok(Math.abs(m.at[0] - BAND_SHELL.x) < BAND_SHELL.hw);
    assert.ok(Math.abs(m.at[1] - BAND_SHELL.z) < BAND_SHELL.hd);
  }
  for (const c of [...CHAIRS, ...CROWD.map((p) => ({ at: p.at }))]) {
    assert.ok(
      c.at[0] > AUDIENCE.x0 - 1 && c.at[0] < AUDIENCE.x1 + 1,
      `x ${c.at[0]}`,
    );
    assert.ok(
      c.at[1] > AUDIENCE.z0 - 1 && c.at[1] < BAND_SHELL.z - BAND_SHELL.hd,
      `z ${c.at[1]}`,
    );
  }
  // the shell is solid, the audience lawn is not
  const inside = (
    poly: readonly (readonly [number, number])[],
    x: number,
    z: number,
  ) => x > poly[0][0] && x < poly[1][0] && z > poly[0][1] && z < poly[2][1];
  assert.ok(PARK_BLOCKERS.some((b) => inside(b, BAND_SHELL.x, BAND_SHELL.z)));
  for (const s of BLANKET_SEATS) {
    assert.ok(!PARK_BLOCKERS.some((b) => inside(b, s.at[0], s.at[1])));
  }
});
