import test from "node:test";
import assert from "node:assert/strict";
import {
  DRUM_LABELS,
  FLOOR_PIANO_FREQUENCIES,
  INSTRUMENT_LABELS,
  NOTE_NAMES,
  PENTATONIC_FREQUENCIES,
  noteFrequency,
  playInstrumentNote,
  type InstrumentType,
} from "./instrumentSynths.ts";

test("pentatonic scale has 8 notes spanning C4 to E5", () => {
  assert.equal(PENTATONIC_FREQUENCIES.length, 8);
  assert.equal(PENTATONIC_FREQUENCIES[0], 261.63);
  assert.equal(PENTATONIC_FREQUENCIES[1], 293.66);
  assert.equal(PENTATONIC_FREQUENCIES[2], 329.63);
  assert.equal(PENTATONIC_FREQUENCIES[3], 392.0);
  assert.equal(PENTATONIC_FREQUENCIES[4], 440.0);
  assert.equal(PENTATONIC_FREQUENCIES[5], 523.25);
  assert.equal(PENTATONIC_FREQUENCIES[6], 587.33);
  assert.equal(PENTATONIC_FREQUENCIES[7], 659.25);
});

test("floor piano scale is one octave below the room scale", () => {
  assert.equal(FLOOR_PIANO_FREQUENCIES.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.ok(FLOOR_PIANO_FREQUENCIES[i] < PENTATONIC_FREQUENCIES[i]);
  }
});

test("noteFrequency resolves piano, marimba, and floor_piano pitches", () => {
  assert.equal(noteFrequency("piano", 0), PENTATONIC_FREQUENCIES[0]);
  assert.equal(noteFrequency("marimba", 4), PENTATONIC_FREQUENCIES[4]);
  assert.equal(noteFrequency("floor_piano", 2), FLOOR_PIANO_FREQUENCIES[2]);
});

test("noteFrequency returns null for drums (percussive, not pitched)", () => {
  assert.equal(noteFrequency("drums", 0), null);
});

test("noteFrequency rejects out-of-range or non-integer note indices", () => {
  assert.equal(noteFrequency("piano", -1), null);
  assert.equal(noteFrequency("piano", 8), null);
  assert.equal(noteFrequency("piano", 1.5), null);
  assert.equal(noteFrequency("piano", Number.NaN), null);
});

test("instrument labels cover every instrument type", () => {
  const instruments: InstrumentType[] = [
    "piano",
    "marimba",
    "drums",
    "floor_piano",
  ];
  for (const instrument of instruments) {
    assert.equal(typeof INSTRUMENT_LABELS[instrument], "string");
    assert.ok(INSTRUMENT_LABELS[instrument].length > 0);
  }
});

test("note names label all 8 keys of the room scale", () => {
  assert.equal(NOTE_NAMES.length, 8);
  assert.deepEqual(NOTE_NAMES, [
    "C4",
    "D4",
    "E4",
    "G4",
    "A4",
    "C5",
    "D5",
    "E5",
  ]);
});

test("drum labels name all 8 percussion pads", () => {
  assert.equal(DRUM_LABELS.length, 8);
  assert.equal(DRUM_LABELS[0], "Kick");
  assert.equal(DRUM_LABELS[1], "Snare");
  assert.equal(DRUM_LABELS[2], "Hi-Hat");
  assert.equal(DRUM_LABELS[3], "Low Bongo");
  assert.equal(DRUM_LABELS[4], "High Bongo");
  assert.equal(DRUM_LABELS[5], "Crash");
  assert.equal(DRUM_LABELS[6], "Clave");
  assert.equal(DRUM_LABELS[7], "Open Hat");
});

function makeFakeAudioContext(): AudioContext {
  const node = () => {
    const gainParam = {
      value: 1,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    };
    return {
      type: "sine",
      frequency: { ...gainParam },
      Q: { ...gainParam },
      gain: { ...gainParam },
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null as unknown,
    };
  };
  return {
    currentTime: 0,
    sampleRate: 44100,
    state: "running",
    destination: {},
    createOscillator: () => node() as unknown,
    createGain: () => node() as unknown,
    createBiquadFilter: () => node() as unknown,
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => node() as unknown,
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  } as unknown as AudioContext;
}

test("playInstrumentNote returns true when a note plays successfully", () => {
  const ctx = makeFakeAudioContext();
  assert.equal(playInstrumentNote("piano", 0, ctx), true);
  assert.equal(playInstrumentNote("marimba", 3, ctx), true);
  assert.equal(playInstrumentNote("floor_piano", 7, ctx), true);
  for (let i = 0; i < 8; i++) {
    assert.equal(playInstrumentNote("drums", i, ctx), true);
  }
});

test("playInstrumentNote returns false for an invalid note index", () => {
  const ctx = makeFakeAudioContext();
  assert.equal(playInstrumentNote("piano", 99, ctx), false);
  assert.equal(playInstrumentNote("piano", -1, ctx), false);
});

test("playInstrumentNote returns false when no audio context is available", () => {
  assert.equal(playInstrumentNote("piano", 0, null), false);
});

test("playInstrumentNote catches constructor/resume errors and returns false", () => {
  const throwingCtx = {
    get currentTime(): number {
      throw new Error("boom");
    },
  } as unknown as AudioContext;
  assert.equal(playInstrumentNote("piano", 0, throwingCtx), false);
});
