import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DJMixerEngine, DEFAULT_DJ_STATE, SCALE_FREQUENCIES } from "./mixer.ts";

describe("Mango Decks mixer", () => {
  it("initializes with default DJ state", () => {
    const mixer = new DJMixerEngine();
    const state = mixer.getState();

    assert.equal(state.bpm, DEFAULT_DJ_STATE.bpm);
    assert.equal(state.isPlaying, false);
    assert.equal(state.crossfader, 0.5);
    assert.equal(state.filterCutoff, 1800);
    assert.equal(state.bassMuted, false);
    assert.equal(state.drumsMuted, false);
    assert.equal(state.leadMuted, false);
  });

  it("clamps and updates BPM correctly", () => {
    const mixer = new DJMixerEngine();

    mixer.setBpm(135);
    assert.equal(mixer.getState().bpm, 135);

    // Clamps below 90
    mixer.setBpm(60);
    assert.equal(mixer.getState().bpm, 90);

    // Clamps above 160
    mixer.setBpm(200);
    assert.equal(mixer.getState().bpm, 160);
  });

  it("clamps and updates filter cutoff correctly", () => {
    const mixer = new DJMixerEngine();

    mixer.setFilterCutoff(2400);
    assert.equal(mixer.getState().filterCutoff, 2400);

    // Clamps below 100
    mixer.setFilterCutoff(20);
    assert.equal(mixer.getState().filterCutoff, 100);

    // Clamps above 4000
    mixer.setFilterCutoff(5000);
    assert.equal(mixer.getState().filterCutoff, 4000);
  });

  it("clamps crossfader between 0 and 1", () => {
    const mixer = new DJMixerEngine();

    mixer.setCrossfader(0.8);
    assert.equal(mixer.getState().crossfader, 0.8);

    mixer.setCrossfader(-0.5);
    assert.equal(mixer.getState().crossfader, 0);

    mixer.setCrossfader(1.5);
    assert.equal(mixer.getState().crossfader, 1);
  });

  it("toggles track mutes independently", () => {
    const mixer = new DJMixerEngine();

    mixer.toggleMute("bass");
    assert.equal(mixer.getState().bassMuted, true);
    assert.equal(mixer.getState().drumsMuted, false);

    mixer.toggleMute("drums");
    assert.equal(mixer.getState().drumsMuted, true);

    mixer.toggleMute("lead");
    assert.equal(mixer.getState().leadMuted, true);

    mixer.toggleMute("bass");
    assert.equal(mixer.getState().bassMuted, false);
  });

  it("handles audio start/stop/airhorn safely in environments without AudioContext", () => {
    const mixer = new DJMixerEngine();

    // In Node.js, window.AudioContext is undefined
    assert.doesNotThrow(() => {
      mixer.start();
      mixer.stop();
      mixer.triggerAirhorn();
      mixer.dispose();
    });
  });

  it("defines standard pentatonic scale frequencies", () => {
    assert.ok(SCALE_FREQUENCIES.length >= 5);
    // Values must be positive strictly ascending frequencies
    for (let i = 1; i < SCALE_FREQUENCIES.length; i++) {
      assert.ok(SCALE_FREQUENCIES[i] > SCALE_FREQUENCIES[i - 1]);
    }
  });
});
