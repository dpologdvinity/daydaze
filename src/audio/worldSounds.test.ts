import { test } from "node:test";
import assert from "node:assert/strict";
import { resetSharedAudioBusForTests } from "./audioBus.ts";
import {
  playCheer,
  playClick,
  playFanfare,
  playFireworkBoom,
  playHorn,
  playPurr,
  playShellNote,
  playSplash,
  playSquirt,
  playStep,
  playThump,
  playWhoosh,
  startAmbience,
  unlockAudio,
} from "./worldSounds.ts";

test("world sounds stay silent and never throw without Web Audio", () => {
  resetSharedAudioBusForTests();
  assert.equal(playStep("hard"), false);
  assert.equal(playStep("soft"), false);
  assert.equal(playWhoosh(), false);
  assert.equal(playClick(), false);
  assert.equal(playFanfare(1), false);
  assert.equal(playFireworkBoom(1), false);
  assert.equal(playShellNote(2), false);
  assert.equal(playPurr(2), false);
  assert.equal(playHorn(), false);
  assert.equal(playCheer(1), false);
  assert.equal(playThump(1), false);
  assert.equal(playSplash(1), false);
  assert.equal(playSquirt(), false);
  const stop = startAmbience("beach");
  assert.equal(typeof stop, "function");
  assert.doesNotThrow(stop);
  assert.doesNotThrow(unlockAudio);
});
