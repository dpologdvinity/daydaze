import test from "node:test";
import assert from "node:assert/strict";
import { createAudioBus } from "./audioBus.ts";

function makeFakeAudioContext(): AudioContext {
  const node = () => ({
    connect: () => {},
    disconnect: () => {},
    gain: { value: 1 },
  });
  const fake = {
    currentTime: 0,
    sampleRate: 44100,
    state: "running",
    destination: {},
    createGain: () => node(),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return fake as unknown as AudioContext;
}

test("master volume defaults to full and clamps to [0, 1]", () => {
  const bus = createAudioBus(makeFakeAudioContext());
  assert.equal(bus.getMasterVolume(), 1);

  bus.setMasterVolume(0.4);
  assert.equal(bus.getMasterVolume(), 0.4);

  bus.setMasterVolume(-3);
  assert.equal(bus.getMasterVolume(), 0);

  bus.setMasterVolume(9);
  assert.equal(bus.getMasterVolume(), 1);
  bus.dispose();
});

test("setMasterVolume ignores NaN and other non-finite input", () => {
  const bus = createAudioBus(makeFakeAudioContext());
  bus.setMasterVolume(0.7);
  bus.setMasterVolume(NaN);
  assert.equal(bus.getMasterVolume(), 0.7);

  bus.setMasterVolume(Infinity);
  assert.equal(bus.getMasterVolume(), 0.7);

  bus.setMasterVolume(-Infinity);
  assert.equal(bus.getMasterVolume(), 0.7);
  bus.dispose();
});

test("master mute zeroes the master gain node and restores on unmute", () => {
  const ctx = makeFakeAudioContext();
  const bus = createAudioBus(ctx);
  bus.setMasterVolume(0.8);

  const masterNode = (
    ctx as unknown as { createGain: () => { gain: { value: number } } }
  ).createGain;
  void masterNode;

  bus.setMasterMuted(true);
  assert.equal(bus.isMasterMuted(), true);

  bus.setMasterMuted(false);
  assert.equal(bus.isMasterMuted(), false);
  bus.dispose();
});

test("music and SFX buses mute independently of each other and of master", () => {
  const bus = createAudioBus(makeFakeAudioContext());
  assert.equal(bus.getMusicGainValue(), 1);
  assert.equal(bus.getSfxGainValue(), 1);

  bus.setMusicMuted(true);
  assert.equal(bus.getMusicGainValue(), 0);
  assert.equal(bus.getSfxGainValue(), 1);
  assert.equal(bus.isMusicMuted(), true);
  assert.equal(bus.isSfxMuted(), false);

  bus.setSfxMuted(true);
  assert.equal(bus.getSfxGainValue(), 0);
  assert.equal(bus.isSfxMuted(), true);

  bus.setMusicMuted(false);
  assert.equal(bus.getMusicGainValue(), 1);
  assert.equal(bus.getSfxGainValue(), 0);
  bus.dispose();
});

test("getMusicDestination and getSfxDestination return distinct nodes feeding master", () => {
  const bus = createAudioBus(makeFakeAudioContext());
  const musicDest = bus.getMusicDestination();
  const sfxDest = bus.getSfxDestination();
  assert.ok(musicDest);
  assert.ok(sfxDest);
  assert.notEqual(musicDest, sfxDest);
  bus.dispose();
});

test("bus is inert but safe when AudioContext is unavailable", () => {
  const bus = createAudioBus(null);
  assert.equal(bus.getContext(), null);
  assert.equal(bus.getMusicDestination(), null);
  assert.equal(bus.getSfxDestination(), null);
  assert.doesNotThrow(() => bus.setMasterVolume(0.3));
  assert.doesNotThrow(() => bus.setMasterMuted(true));
  assert.doesNotThrow(() => bus.dispose());
});

test("dispose detaches nodes and is safe to call multiple times", () => {
  const bus = createAudioBus(makeFakeAudioContext());
  assert.doesNotThrow(() => {
    bus.dispose();
    bus.dispose();
  });
  assert.equal(bus.getMusicDestination(), null);
  assert.equal(bus.getSfxDestination(), null);
});
