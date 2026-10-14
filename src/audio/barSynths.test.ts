import test from "node:test";
import assert from "node:assert/strict";
import { playBarSound, type BarSound } from "./barSynths.ts";

const SOUNDS: BarSound[] = ["pour", "shake", "ding"];

function makeFakeAudioContext(): AudioContext {
  const param = () => ({
    value: 1,
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
  });
  const node = () => ({
    type: "sine",
    frequency: param(),
    Q: param(),
    gain: param(),
    buffer: null as unknown,
    connect: () => {},
    start: () => {},
    stop: () => {},
  });
  return {
    currentTime: 0,
    sampleRate: 8000,
    state: "running",
    destination: {},
    createOscillator: node,
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    resume: () => Promise.resolve(),
  } as unknown as AudioContext;
}

test("every bar sound plays on a working audio context", () => {
  const ctx = makeFakeAudioContext();
  for (const sound of SOUNDS) assert.equal(playBarSound(sound, ctx), true);
});

test("bar sounds report false without audio and never throw", () => {
  for (const sound of SOUNDS) {
    assert.equal(playBarSound(sound, null), false);
    // Node has no Web Audio, so the shared bus has no context either.
    assert.equal(playBarSound(sound), false);
  }
  const broken = {
    get currentTime(): number {
      throw new Error("boom");
    },
  } as unknown as AudioContext;
  assert.equal(playBarSound("ding", broken), false);
});
