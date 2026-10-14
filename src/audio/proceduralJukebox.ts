import { getSharedAudioBus } from "./audioBus.ts";

export type TrackId =
  | "savanna-nightclub"
  | "canopy-lofi"
  | "waterhole-twilight"
  | "carnival-calliope";

export type TrackMetadata = {
  id: TrackId;
  title: string;
  genre: string;
  bpm: number;
  description: string;
  mood: string;
};

export const JUKEBOX_TRACKS: readonly TrackMetadata[] = [
  {
    id: "savanna-nightclub",
    title: "Savanna Nightclub",
    genre: "House",
    bpm: 128,
    description:
      "Four-on-the-floor kick, synth bassline arpeggios, snappy snare, and shimmering hi-hats.",
    mood: "Energetic",
  },
  {
    id: "canopy-lofi",
    title: "Canopy Lo-Fi Lounge",
    genre: "Lo-Fi",
    bpm: 82,
    description:
      "Warm electric piano seventh chords over gentle vinyl crackle and acoustic brush snare.",
    mood: "Chill",
  },
  {
    id: "waterhole-twilight",
    title: "Waterhole Twilight",
    genre: "Ambient",
    bpm: 68,
    description:
      "Soothing pan flute pentatonic melody with rippling water resonance and evening crickets.",
    mood: "Peaceful",
  },
  {
    id: "carnival-calliope",
    title: "Carnival Calliope",
    genre: "Waltz",
    bpm: 132,
    description: "Nostalgic mechanical carousel organ waltz in 3/4 time.",
    mood: "Whimsical",
  },
];

const TRACK_IDS: readonly TrackId[] = JUKEBOX_TRACKS.map((t) => t.id);

function isTrackId(id: string): id is TrackId {
  return (TRACK_IDS as readonly string[]).includes(id);
}

export interface JukeboxController {
  playTrack(id: TrackId): boolean;
  stopTrack(): void;
  getCurrentTrack(): TrackId | null;
  isPlaying(): boolean;
  setMusicVolume(vol: number): void;
  getMusicVolume(): number;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  dispose(): void;
}

type AnyNode = AudioNode;

const PENTATONIC_FLUTE = [392.0, 440.0, 523.25, 587.33, 659.25, 784.0];
const CALLIOPE_SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0];

function getAudioContextClass(): typeof AudioContext | undefined {
  return (
    (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ||
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function whiteNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** How far ahead of real time we schedule audio events, in seconds. */
const SCHEDULE_AHEAD_SECONDS = 0.1;
/** How often the timer wakes up to top off the schedule, in milliseconds. */
const SCHEDULER_INTERVAL_MS = 25;
/**
 * If the wall clock has drifted further than this behind the next scheduled
 * step (e.g. the tab was backgrounded), resync to "now" instead of racing to
 * catch up by firing a burst of stale steps.
 */
const MAX_CATCH_UP_SECONDS = 1.0;

export type DueStep = { step: number; time: number };

/**
 * Pure scheduling-window function: given the next unscheduled step's audio
 * time, the step interval, the current audio clock, and the lookahead
 * horizon, returns every step due to fire before the horizon plus the
 * updated step/time counters. If the wall clock has drifted further than
 * `maxCatchUpSeconds` behind `nextStepTime` (e.g. a backgrounded tab), it
 * resyncs to `now` instead of returning a burst of stale steps.
 */
export function collectDueSteps(
  step: number,
  nextStepTime: number,
  stepSeconds: number,
  now: number,
  lookaheadSeconds: number,
  maxCatchUpSeconds: number,
): { due: DueStep[]; nextStep: number; nextStepTime: number } {
  let resyncedTime = nextStepTime;
  if (resyncedTime < now - maxCatchUpSeconds) {
    resyncedTime = now;
  }
  const horizon = now + lookaheadSeconds;
  const due: DueStep[] = [];
  let nextStep = step;
  while (resyncedTime < horizon) {
    due.push({ step: nextStep, time: resyncedTime });
    nextStep += 1;
    resyncedTime += stepSeconds;
  }
  return { due, nextStep, nextStepTime: resyncedTime };
}

/**
 * Lookahead scheduler: a low-resolution timer wakes up frequently and
 * schedules every step whose audio-clock time falls inside the lookahead
 * window, using the AudioContext clock (not timer delivery time) as the
 * source of truth. This keeps tempo accurate even when the timer itself is
 * delayed by the event loop.
 */
class LoopEngine {
  private readonly ctx: AudioContext;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextStepTime = 0;
  private stepSeconds = 0;
  private onStep:
    ((ctx: AudioContext, step: number, time: number) => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  start(
    stepSeconds: number,
    onStep: (ctx: AudioContext, step: number, time: number) => void,
  ) {
    this.stop();
    this.step = 0;
    this.stepSeconds = stepSeconds;
    this.onStep = onStep;
    this.nextStepTime = this.ctx.currentTime;
    this.scheduleReadySteps();
    this.timerId = setInterval(
      () => this.scheduleReadySteps(),
      SCHEDULER_INTERVAL_MS,
    );
  }

  private scheduleReadySteps() {
    const { due, nextStep, nextStepTime } = collectDueSteps(
      this.step,
      this.nextStepTime,
      this.stepSeconds,
      this.ctx.currentTime,
      SCHEDULE_AHEAD_SECONDS,
      MAX_CATCH_UP_SECONDS,
    );
    this.step = nextStep;
    this.nextStepTime = nextStepTime;
    for (const { step, time } of due) {
      try {
        this.onStep?.(this.ctx, step, time);
      } catch {
        /* keep the loop alive even if a single tick fails to synthesize */
      }
    }
  }

  stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.onStep = null;
  }
}

function playKick(ctx: AudioContext, dest: AnyNode, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.25);
}

function playSnareHit(ctx: AudioContext, dest: AnyNode, now: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.15);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playHiHatHit(ctx: AudioContext, dest: AnyNode, now: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.04);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playBassNote(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(frequency, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.18);
}

/**
 * Step grid runs at 8th-note resolution (two steps per beat) so the hi-hat
 * can subdivide, but the four-on-the-floor kick and bassline only fire on
 * quarter notes (even steps), keeping the beat at the advertised BPM.
 */
export function savannaNightclubStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  playHiHatHit(ctx, dest, now);
  if (step % 2 !== 0) return;
  const beat = (step / 2) % 4;
  playKick(ctx, dest, now);
  if (beat === 2) playSnareHit(ctx, dest, now);
  const bassLine = [110, 110, 146.83, 130.81];
  playBassNote(ctx, dest, now, bassLine[beat % bassLine.length]);
}

function playElectricPianoChord(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  rootFrequency: number,
) {
  const intervals = [1, 1.25, 1.5, 1.875];
  for (const ratio of intervals) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(rootFrequency * ratio, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 1.6);
  }
}

function playVinylCrackle(ctx: AudioContext, dest: AnyNode, now: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.08);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 4000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playBrushSnare(ctx: AudioContext, dest: AnyNode, now: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.3);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function canopyLofiStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const chordRoots = [220, 246.94, 196, 233.08];
  if (step % 2 === 0) {
    playElectricPianoChord(
      ctx,
      dest,
      now,
      chordRoots[step % chordRoots.length],
    );
  }
  playVinylCrackle(ctx, dest, now);
  if (step % 4 === 2) playBrushSnare(ctx, dest, now);
}

function playPanFlute(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
) {
  const osc = ctx.createOscillator();
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  vibrato.type = "sine";
  vibrato.frequency.setValueAtTime(5, now);
  vibratoGain.gain.setValueAtTime(3, now);
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  vibrato.start(now);
  osc.stop(now + 1.8);
  vibrato.stop(now + 1.8);
}

function playWaterRipple(ctx: AudioContext, dest: AnyNode, now: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 1.0);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.linearRampToValueAtTime(900, now + 1.0);
  filter.Q.value = 4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playCricketChirp(ctx: AudioContext, dest: AnyNode, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(4200, now);
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.05);
}

function waterholeTwilightStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  if (step % 2 === 0) {
    playPanFlute(
      ctx,
      dest,
      now,
      PENTATONIC_FLUTE[step % PENTATONIC_FLUTE.length],
    );
  }
  if (step % 3 === 0) playWaterRipple(ctx, dest, now);
  if (step % 5 === 1) playCricketChirp(ctx, dest, now + 0.1);
}

function playCalliopeNote(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
) {
  const osc = ctx.createOscillator();
  const detuned = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, now);
  detuned.type = "sawtooth";
  detuned.frequency.setValueAtTime(frequency * 1.005, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  detuned.connect(gain);
  gain.connect(dest);
  osc.start(now);
  detuned.start(now);
  osc.stop(now + 0.4);
  detuned.stop(now + 0.4);
}

/**
 * Step grid runs at 8th-note resolution (two steps per beat) so the melody
 * can play a note on every step, but the waltz beat (the low oom-pah note
 * and the 3/4 bar count) only advances on quarter notes (even steps),
 * keeping the beat at the advertised BPM in 3/4 meter.
 */
export function carnivalCalliopeStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const melody = [0, 2, 4, 2, 1, 3];
  const noteIndex = melody[step % melody.length];
  playCalliopeNote(ctx, dest, now, CALLIOPE_SCALE[noteIndex]);
  if (step % 2 !== 0) return;
  const beatInBar = (step / 2) % 3;
  if (beatInBar === 0) {
    playCalliopeNote(ctx, dest, now, CALLIOPE_SCALE[0] / 2);
  }
}

type TrackProgram = {
  stepSeconds: (bpm: number) => number;
  step: (ctx: AudioContext, dest: AnyNode, step: number, time: number) => void;
};

export const TRACK_PROGRAMS: Record<TrackId, TrackProgram> = {
  "savanna-nightclub": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: savannaNightclubStep,
  },
  "canopy-lofi": {
    stepSeconds: (bpm) => 60 / bpm,
    step: canopyLofiStep,
  },
  "waterhole-twilight": {
    stepSeconds: (bpm) => 60 / bpm,
    step: waterholeTwilightStep,
  },
  "carnival-calliope": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: carnivalCalliopeStep,
  },
};

const TRACK_BPM: Record<TrackId, number> = Object.fromEntries(
  JUKEBOX_TRACKS.map((t) => [t.id, t.bpm]),
) as Record<TrackId, number>;

class JukeboxControllerImpl implements JukeboxController {
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private loop: LoopEngine | null = null;
  private currentTrack: TrackId | null = null;
  private volume = 0.6;
  private muted = false;
  private disposed = false;

  constructor(ctx: AudioContext | null, musicDestination?: AudioNode | null) {
    this.ctx = ctx;
    if (ctx) {
      try {
        this.master = ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(musicDestination ?? ctx.destination);
      } catch {
        this.ctx = null;
        this.master = null;
      }
    }
  }

  playTrack(id: TrackId): boolean {
    if (this.disposed) return false;
    if (!this.ctx || !this.master) return false;
    if (!isTrackId(id)) return false;
    try {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      this.loop?.stop();
      const program = TRACK_PROGRAMS[id];
      const stepSeconds = program.stepSeconds(TRACK_BPM[id]);
      this.loop = new LoopEngine(this.ctx);
      const dest = this.master;
      this.loop.start(stepSeconds, (ctx, step, time) =>
        program.step(ctx, dest, step, time),
      );
      this.currentTrack = id;
      return true;
    } catch {
      this.currentTrack = null;
      return false;
    }
  }

  stopTrack(): void {
    try {
      this.loop?.stop();
    } catch {
      /* ignore */
    }
    this.loop = null;
    this.currentTrack = null;
  }

  getCurrentTrack(): TrackId | null {
    return this.currentTrack;
  }

  isPlaying(): boolean {
    return this.currentTrack !== null;
  }

  setMusicVolume(vol: number): void {
    if (!Number.isFinite(vol)) return;
    this.volume = Math.min(1, Math.max(0, vol));
    this.applyGain();
  }

  getMusicVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private applyGain(): void {
    if (!this.master) return;
    try {
      this.master.gain.value = this.muted ? 0 : this.volume;
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    if (this.disposed) {
      this.stopTrack();
      return;
    }
    this.stopTrack();
    try {
      this.master?.disconnect();
    } catch {
      /* ignore */
    }
    this.master = null;
    this.disposed = true;
  }
}

function resolveAudioContext(ctx?: AudioContext | null): AudioContext | null {
  if (ctx) return ctx;
  if (ctx === null) return null;
  try {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  } catch {
    return null;
  }
}

export function createJukeboxController(
  ctx?: AudioContext | null,
  musicDestination?: AudioNode | null,
): JukeboxController {
  const resolved = resolveAudioContext(ctx);
  return new JukeboxControllerImpl(resolved, musicDestination);
}

let sharedController: JukeboxController | null = null;

/**
 * Lazily creates one controller shared by AudioControls and JukeboxModal.
 * Routes through the shared AudioBus music destination so the global
 * Music mute/volume control reaches jukebox playback.
 */
export function getSharedJukeboxController(): JukeboxController {
  if (!sharedController) {
    const bus = getSharedAudioBus();
    sharedController = createJukeboxController(
      bus.getContext(),
      bus.getMusicDestination(),
    );
  }
  return sharedController;
}
