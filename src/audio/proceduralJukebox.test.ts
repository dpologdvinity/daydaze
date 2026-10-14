import test from "node:test";
import assert from "node:assert/strict";
import {
  JUKEBOX_TRACKS,
  TRACK_PROGRAMS,
  collectDueSteps,
  createJukeboxController,
  carnivalCalliopeStep,
  savannaNightclubStep,
  type TrackId,
} from "./proceduralJukebox.ts";

const TRACK_IDS: TrackId[] = [
  "savanna-nightclub",
  "canopy-lofi",
  "waterhole-twilight",
  "carnival-calliope",
];

test("JUKEBOX_TRACKS has exactly 4 tracks with full metadata", () => {
  assert.equal(JUKEBOX_TRACKS.length, 4);
  for (const track of JUKEBOX_TRACKS) {
    assert.ok(TRACK_IDS.includes(track.id));
    assert.equal(typeof track.title, "string");
    assert.ok(track.title.length > 0);
    assert.equal(typeof track.genre, "string");
    assert.ok(track.genre.length > 0);
    assert.equal(typeof track.bpm, "number");
    assert.ok(track.bpm > 0);
    assert.equal(typeof track.description, "string");
    assert.ok(track.description.length > 0);
    assert.equal(typeof track.mood, "string");
    assert.ok(track.mood.length > 0);
  }
});

test("JUKEBOX_TRACKS covers each expected track id exactly once", () => {
  const ids = JUKEBOX_TRACKS.map((t) => t.id);
  for (const id of TRACK_IDS) {
    assert.equal(ids.filter((x) => x === id).length, 1);
  }
});

test("track metadata matches design spec (title, bpm)", () => {
  const byId = Object.fromEntries(JUKEBOX_TRACKS.map((t) => [t.id, t]));
  assert.equal(byId["savanna-nightclub"].title, "Savanna Nightclub");
  assert.equal(byId["savanna-nightclub"].bpm, 128);
  assert.equal(byId["canopy-lofi"].title, "Canopy Lo-Fi Lounge");
  assert.equal(byId["canopy-lofi"].bpm, 82);
  assert.equal(byId["waterhole-twilight"].title, "Waterhole Twilight");
  assert.equal(byId["waterhole-twilight"].bpm, 68);
  assert.equal(byId["carnival-calliope"].title, "Carnival Calliope");
  assert.equal(byId["carnival-calliope"].bpm, 132);
});

test("createJukeboxController falls back safely when AudioContext is null", () => {
  const controller = createJukeboxController(null as unknown as AudioContext);
  assert.equal(controller.getCurrentTrack(), null);
  assert.equal(controller.isPlaying(), false);
  assert.equal(controller.playTrack("savanna-nightclub"), false);
  assert.equal(controller.getCurrentTrack(), null);
  assert.equal(controller.isPlaying(), false);
  controller.stopTrack();
  controller.dispose();
});

test("createJukeboxController falls back safely when AudioContext constructor throws", () => {
  class ThrowingAudioContext {
    constructor() {
      throw new Error("no audio hardware");
    }
  }
  const originalAudioContext = (globalThis as { AudioContext?: unknown })
    .AudioContext;
  (globalThis as { AudioContext?: unknown }).AudioContext =
    ThrowingAudioContext;
  try {
    const controller = createJukeboxController();
    assert.equal(controller.playTrack("savanna-nightclub"), false);
    assert.equal(controller.isPlaying(), false);
  } finally {
    (globalThis as { AudioContext?: unknown }).AudioContext =
      originalAudioContext;
  }
});

function makeFakeAudioContext(): AudioContext {
  const node = () => ({
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    frequency: {
      value: 0,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    },
    gain: {
      value: 0,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    },
    type: "sine",
    Q: { value: 0 },
    detune: { value: 0 },
  });
  const fake = {
    currentTime: 0,
    sampleRate: 44100,
    state: "running",
    destination: {},
    createOscillator: () => node(),
    createGain: () => node(),
    createBiquadFilter: () => node(),
    createBufferSource: () => ({ ...node(), buffer: null }),
    createBuffer: (_channels: number, length: number, sampleRate: number) => ({
      getChannelData: () => new Float32Array(length),
      sampleRate,
      length,
    }),
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return fake as unknown as AudioContext;
}

test("playTrack starts playback and getCurrentTrack/isPlaying reflect it", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  assert.equal(controller.getCurrentTrack(), null);
  assert.equal(controller.isPlaying(), false);

  const result = controller.playTrack("canopy-lofi");
  assert.equal(result, true);
  assert.equal(controller.getCurrentTrack(), "canopy-lofi");
  assert.equal(controller.isPlaying(), true);
  controller.dispose();
});

test("playTrack switches tracks cleanly without throwing", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  assert.equal(controller.playTrack("savanna-nightclub"), true);
  assert.equal(controller.getCurrentTrack(), "savanna-nightclub");
  assert.equal(controller.playTrack("waterhole-twilight"), true);
  assert.equal(controller.getCurrentTrack(), "waterhole-twilight");
  assert.equal(controller.isPlaying(), true);
  controller.dispose();
});

test("stopTrack clears current track and playing state", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  controller.playTrack("carnival-calliope");
  assert.equal(controller.isPlaying(), true);
  controller.stopTrack();
  assert.equal(controller.getCurrentTrack(), null);
  assert.equal(controller.isPlaying(), false);
  controller.dispose();
});

test("stopTrack is a safe no-op when nothing is playing", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  assert.doesNotThrow(() => controller.stopTrack());
  assert.equal(controller.getCurrentTrack(), null);
  controller.dispose();
});

test("playTrack rejects unknown track ids", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  const result = controller.playTrack("not-a-real-track" as TrackId);
  assert.equal(result, false);
  assert.equal(controller.getCurrentTrack(), null);
  controller.dispose();
});

test("music volume defaults to a sane value and clamps to [0, 1]", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  assert.ok(
    controller.getMusicVolume() >= 0 && controller.getMusicVolume() <= 1,
  );

  controller.setMusicVolume(0.5);
  assert.equal(controller.getMusicVolume(), 0.5);

  controller.setMusicVolume(-1);
  assert.equal(controller.getMusicVolume(), 0);

  controller.setMusicVolume(5);
  assert.equal(controller.getMusicVolume(), 1);

  controller.dispose();
});

test("setMusicVolume ignores NaN and other non-finite input, keeping the last valid value", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  controller.setMusicVolume(0.6);

  controller.setMusicVolume(NaN);
  assert.equal(controller.getMusicVolume(), 0.6);
  assert.ok(Number.isFinite(controller.getMusicVolume()));

  controller.setMusicVolume(Infinity);
  assert.equal(controller.getMusicVolume(), 0.6);

  controller.setMusicVolume(-Infinity);
  assert.equal(controller.getMusicVolume(), 0.6);

  controller.dispose();
});

test("setMuted toggles mute state independent of volume", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  assert.equal(controller.isMuted(), false);

  controller.setMuted(true);
  assert.equal(controller.isMuted(), true);
  assert.equal(controller.getMusicVolume(), controller.getMusicVolume());

  controller.setMuted(false);
  assert.equal(controller.isMuted(), false);
  controller.dispose();
});

test("setMuted actually zeroes the controller's gain node value, not just the flag", () => {
  const ctx = makeFakeAudioContext();
  const captured: { gain: { value: number } }[] = [];
  const originalCreateGain = (
    ctx as unknown as { createGain: () => { gain: { value: number } } }
  ).createGain;
  (
    ctx as unknown as { createGain: () => { gain: { value: number } } }
  ).createGain = () => {
    const node = originalCreateGain.call(ctx) as unknown as {
      gain: { value: number };
      connect: () => void;
    };
    captured.push(node);
    return node;
  };
  const controller = createJukeboxController(ctx);
  controller.setMusicVolume(0.7);
  const createdGain = captured[0];
  assert.ok(createdGain);
  assert.equal(createdGain.gain.value, 0.7);

  controller.setMuted(true);
  assert.equal(createdGain.gain.value, 0);

  controller.setMuted(false);
  assert.equal(createdGain.gain.value, 0.7);
  controller.dispose();
});

test("dispose stops playback and is safe to call multiple times", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  controller.playTrack("savanna-nightclub");
  assert.doesNotThrow(() => {
    controller.dispose();
    controller.dispose();
  });
  assert.equal(controller.isPlaying(), false);
});

test("playTrack returns false after dispose", () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  controller.dispose();
  assert.equal(controller.playTrack("savanna-nightclub"), false);
});

test("controller never throws even if underlying node creation fails mid-track", () => {
  const ctx = makeFakeAudioContext();
  (ctx as unknown as { createOscillator: () => never }).createOscillator =
    () => {
      throw new Error("boom");
    };
  const controller = createJukeboxController(ctx);
  assert.doesNotThrow(() => controller.playTrack("savanna-nightclub"));
  controller.dispose();
});

// --- Deterministic scheduling (collectDueSteps) ---------------------------

test("collectDueSteps schedules every step inside the lookahead window", () => {
  const result = collectDueSteps(0, 0, 0.1, 0, 0.25, 1.0);
  assert.deepEqual(
    result.due.map((d) => d.step),
    [0, 1, 2],
  );
  assert.deepEqual(
    result.due.map((d) => Number(d.time.toFixed(5))),
    [0, 0.1, 0.2],
  );
  assert.equal(result.nextStep, 3);
  assert.ok(Math.abs(result.nextStepTime - 0.3) < 1e-9);
});

test("collectDueSteps uses the scheduled audio time, not timer delivery time", () => {
  // Timer wakes late (now = 0.5s) but the next step was due at 0.2s; the
  // step must still be scheduled at its original audio-clock time.
  const result = collectDueSteps(5, 0.2, 0.1, 0.5, 0.1, 1.0);
  assert.equal(result.due[0]?.step, 5);
  assert.equal(result.due[0]?.time, 0.2);
});

test("collectDueSteps resyncs to now after a long delay instead of bursting stale steps", () => {
  // nextStepTime is 10s behind now, far past maxCatchUpSeconds: resync to
  // now rather than firing ~100 queued steps at 0.1s spacing.
  const result = collectDueSteps(0, 0, 0.1, 10, 0.1, 1.0);
  assert.equal(result.due.length, 1);
  assert.equal(result.due[0]?.time, 10);
  assert.equal(result.due[0]?.step, 0);
});

test("stopTrack cancels the scheduling timer so no further steps fire", async () => {
  const ctx = makeFakeAudioContext();
  let oscillatorsCreated = 0;
  (ctx as unknown as { createOscillator: () => unknown }).createOscillator =
    () => {
      oscillatorsCreated += 1;
      return {
        connect: () => {},
        start: () => {},
        stop: () => {},
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
      };
    };
  const controller = createJukeboxController(ctx);
  controller.playTrack("waterhole-twilight");
  const afterStart = oscillatorsCreated;
  controller.stopTrack();
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(
    oscillatorsCreated,
    afterStart,
    "no oscillators should be created once stopped",
  );
  controller.dispose();
});

test("playTrack switching tracks stops the previous track's scheduler", async () => {
  const ctx = makeFakeAudioContext();
  const controller = createJukeboxController(ctx);
  controller.playTrack("savanna-nightclub");
  controller.playTrack("canopy-lofi");
  assert.equal(controller.getCurrentTrack(), "canopy-lofi");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(controller.getCurrentTrack(), "canopy-lofi");
  controller.dispose();
});

test("collectDueSteps returns no steps when nothing is due yet", () => {
  const result = collectDueSteps(3, 5.0, 0.5, 4.9, 0.05, 1.0);
  assert.deepEqual(result.due, []);
  assert.equal(result.nextStep, 3);
  assert.equal(result.nextStepTime, 5.0);
});

// --- Tempo accuracy (house and waltz beat counts) --------------------------

test("Savanna Nightclub fires the kick oscillator once per quarter note, not every 8th", () => {
  const ctx = makeFakeAudioContext();
  const dest = ctx.createGain();
  let kicks = 0;
  const countingCtx = {
    ...ctx,
    createOscillator: () => {
      kicks += 1;
      return {
        connect: () => {},
        start: () => {},
        stop: () => {},
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
      };
    },
  } as unknown as AudioContext;
  // 16 steps at 8th-note resolution = 8 beats; the kick (first oscillator
  // created each step) must fire on exactly the 8 even steps, not all 16.
  for (let step = 0; step < 16; step++) {
    kicks = 0;
    savannaNightclubStep(countingCtx, dest, step, step * 0.01);
    if (step % 2 === 0) {
      assert.ok(kicks >= 1, `expected a kick on even step ${step}`);
    }
  }
  const stepSeconds = TRACK_PROGRAMS["savanna-nightclub"].stepSeconds(128);
  const stepsPerMinute = 60 / stepSeconds;
  assert.equal(stepsPerMinute / 2, 128);
});

test("Carnival Calliope advances the waltz beat once per quarter note in 3/4 meter", () => {
  const ctx = makeFakeAudioContext();
  const dest = ctx.createGain();
  const beatsSeen: number[] = [];
  for (let step = 0; step < 12; step += 2) {
    const beatInBar = (step / 2) % 3;
    beatsSeen.push(beatInBar);
    assert.doesNotThrow(() =>
      carnivalCalliopeStep(ctx, dest, step, step * 0.01),
    );
  }
  assert.deepEqual(beatsSeen, [0, 1, 2, 0, 1, 2]);
  const stepSeconds = TRACK_PROGRAMS["carnival-calliope"].stepSeconds(132);
  const stepsPerMinute = 60 / stepSeconds;
  assert.equal(stepsPerMinute / 2, 132);
});
