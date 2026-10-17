import { test } from "node:test";
import assert from "node:assert/strict";
import { resetSharedAudioBusForTests } from "./audioBus.ts";
import {
  playClick,
  playStep,
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
  const stop = startAmbience("beach");
  assert.equal(typeof stop, "function");
  assert.doesNotThrow(stop);
  assert.doesNotThrow(unlockAudio);
});
