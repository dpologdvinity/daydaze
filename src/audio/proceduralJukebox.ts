import { getSharedAudioBus } from "./audioBus.ts";

export type TrackId =
  | "savanna-nightclub"
  | "canopy-lofi"
  | "waterhole-twilight"
  | "carnival-calliope"
  | "sugar-rush-pop"
  | "warehouse-acid"
  | "player-two-chiptune"
  | "la-noche-salsa"
  | "roller-disco";

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
  {
    id: "sugar-rush-pop",
    title: "Sugar Rush",
    genre: "Bubblegum Pop",
    bpm: 124,
    description:
      "Y2K bubblegum pop: bouncing octave bass, square-wave arpeggios, handclaps and a glassy chime on every bar.",
    mood: "Giddy",
  },
  {
    id: "warehouse-acid",
    title: "Warehouse Acid",
    genre: "Techno",
    bpm: 132,
    description:
      "Warehouse techno: a deep rolling kick, offbeat rumble, open hats and a squelching acid line that opens and closes.",
    mood: "Driving",
  },
  {
    id: "player-two-chiptune",
    title: "Player Two",
    genre: "Chiptune",
    bpm: 150,
    description:
      "An arcade cabinet's song: a square-wave lead, a triangle bass and noise drums, round C, A minor, F and G.",
    mood: "Playful",
  },
  {
    id: "la-noche-salsa",
    title: "La Noche",
    genre: "Salsa",
    bpm: 190,
    description:
      "Salsa in 2-3 son clave: a piano montuno, conga tumbao, cowbell and an anticipated bass, round C, F and G.",
    mood: "Hot",
  },
  {
    id: "roller-disco",
    title: "Roller Disco",
    genre: "Disco",
    bpm: 118,
    description:
      "Roller-rink disco: four on the floor, open offbeat hats, an octave-walking bass and string stabs on two and four.",
    mood: "Groovy",
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

// Sugar Rush: four bars round A, E, F#m and D, an eighth-note grid.
const SUGAR_ROOTS = [110, 82.41, 92.5, 73.42];
const MAJOR = [1, 1.26, 1.498, 2];
const MINOR = [1, 1.189, 1.498, 2];
const SUGAR_CHORDS = [MAJOR, MAJOR, MINOR, MAJOR];
// which chord tone the arpeggio plays on each eighth of a bar
const SUGAR_ARP = [0, 1, 2, 3, 2, 1, 2, 3];

/** A bright square-wave pluck whose filter snaps shut. */
function playPluck(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
  level: number,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(4200, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.15);
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** A handclap: two quick noise bursts, the second one ringing a little. */
function playClap(ctx: AudioContext, dest: AnyNode, now: number) {
  for (const [at, decay] of [
    [0, 0.03],
    [0.012, 0.13],
  ] as const) {
    const noise = ctx.createBufferSource();
    noise.buffer = whiteNoiseBuffer(ctx, 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1300;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, now + at);
    gain.gain.exponentialRampToValueAtTime(0.001, now + at + decay);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(now + at);
  }
}

export function sugarRushPopStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const bar = Math.floor(step / 8) % SUGAR_ROOTS.length;
  const root = SUGAR_ROOTS[bar];
  const chord = SUGAR_CHORDS[bar];
  playPluck(ctx, dest, now, root * 4 * chord[SUGAR_ARP[step % 8]], 0.08);
  // the bass bounces between the root and its octave on every eighth
  playBassNote(ctx, dest, now, step % 2 ? root * 2 : root);
  if (step % 2) {
    playHiHatHit(ctx, dest, now);
    return;
  }
  playKick(ctx, dest, now);
  const beat = (step / 2) % 4;
  if (beat === 1 || beat === 3) playClap(ctx, dest, now);
  if (step % 8 === 0) playPluck(ctx, dest, now, root * 8, 0.04);
}

// Warehouse Acid: a two-bar acid riff in A minor over a rolling kick.
// Each eighth: a semitone above A1 (or null for a rest) and an accent.
const ACID_RIFF: readonly (readonly [number | null, boolean])[] = [
  [0, true],
  [0, false],
  [12, false],
  [null, false],
  [0, true],
  [3, false],
  [0, false],
  [10, true],
  [0, true],
  [0, false],
  [7, false],
  [null, false],
  [12, true],
  [0, false],
  [3, true],
  [5, false],
];

/** A 303-ish acid note: a sawtooth through a resonant lowpass that snaps
 * open and shut; `open` (0..1) sets how far it opens. */
function playAcidNote(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
  open: number,
  accent: boolean,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(frequency, now);
  filter.type = "lowpass";
  filter.Q.value = 14;
  const peak = 400 + open * 2600 * (accent ? 1.4 : 1);
  filter.frequency.setValueAtTime(peak, now);
  filter.frequency.exponentialRampToValueAtTime(260, now + 0.16);
  gain.gain.setValueAtTime(accent ? 0.16 : 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** A low sine thump on the offbeat, under the kick's tail: the rumble. */
function playRumble(ctx: AudioContext, dest: AnyNode, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(55, now);
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function warehouseAcidStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const [semitone, accent] = ACID_RIFF[step % ACID_RIFF.length];
  // the filter breathes over eight bars
  const open = 0.5 - Math.cos((step / 64) * Math.PI * 2) * 0.5;
  if (semitone !== null)
    playAcidNote(ctx, dest, now, 55 * 2 ** (semitone / 12), open, accent);
  if (step % 2) {
    playHiHatHit(ctx, dest, now);
    playRumble(ctx, dest, now);
    return;
  }
  playKick(ctx, dest, now);
  const beat = (step / 2) % 4;
  if (beat === 1 || beat === 3) playClap(ctx, dest, now);
}

// Player Two: an eight-bar chiptune loop. The lead, by eighth note, in
// semitones above C5 (null rests); the bass's root for each bar.
const CHIP_LEAD: readonly (number | null)[] = [
  0,
  4,
  7,
  12,
  7,
  4,
  7,
  null,
  9,
  12,
  16,
  12,
  9,
  7,
  4,
  null,
  5,
  9,
  12,
  17,
  12,
  9,
  12,
  null,
  7,
  11,
  14,
  19,
  14,
  11,
  7,
  2,
];
const CHIP_BASS = [130.81, 110, 87.31, 98];

/** A plain wave with a quick, clicky envelope: the sound of the chips. */
function playChip(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
  type: OscillatorType,
  level: number,
  length: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(level, now);
  gain.gain.setValueAtTime(level, now + length * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, now + length);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + length);
}

export function playerTwoChiptuneStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const note = CHIP_LEAD[step % CHIP_LEAD.length];
  if (note !== null)
    playChip(ctx, dest, now, 523.25 * 2 ** (note / 12), "square", 0.06, 0.16);
  // a bar is eight eighths; the bass changes every two bars
  const root = CHIP_BASS[Math.floor(step / 16) % CHIP_BASS.length];
  if (step % 2 === 0)
    playChip(
      ctx,
      dest,
      now,
      step % 4 === 0 ? root : root * 2,
      "triangle",
      0.22,
      0.18,
    );
  if (step % 2) {
    playHiHatHit(ctx, dest, now);
    return;
  }
  const beat = (step / 2) % 4;
  if (beat === 0) playKick(ctx, dest, now);
  if (beat === 2) playSnareHit(ctx, dest, now);
}

// La Noche: two bars of 2-3 son clave on a sixteen-eighth grid, with a
// piano montuno and the bass's tumbao (it lands on the "and" of two and
// on four, anticipating the next chord).
const CLAVE = new Set([2, 4, 8, 11, 14]);
const SALSA_CHORDS: readonly (readonly number[])[] = [
  [261.63, 329.63, 392],
  [349.23, 440, 523.25],
  [392, 493.88, 587.33],
  [349.23, 440, 523.25],
];
const SALSA_BASS = [65.41, 87.31, 98, 87.31];
// which chord tone the montuno strikes, by eighth (-1 a rest)
const MONTUNO = [0, 2, 1, 2, -1, 2, 1, 2];

/** A short knock: clave, cowbell or a conga's slap, by pitch and decay. */
function playKnock(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  frequency: number,
  level: number,
  decay: number,
  drop = 1,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(frequency * drop, now + decay);
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + decay);
}

export function laNocheSalsaStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const inBars = step % 16;
  // a chord per bar, two bars per pass of the clave
  const bar = Math.floor(step / 8) % SALSA_CHORDS.length;
  const chord = SALSA_CHORDS[bar];
  if (CLAVE.has(inBars)) playKnock(ctx, dest, now, 2500, 0.14, 0.05);
  const tone = MONTUNO[step % 8];
  if (tone >= 0)
    playChip(ctx, dest, now, chord[tone] * 2, "triangle", 0.07, 0.14);
  // the bass anticipates: the "and" of two and the fourth beat
  const beat8 = step % 8;
  if (beat8 === 3 || beat8 === 6)
    playChip(
      ctx,
      dest,
      now,
      beat8 === 6 ? SALSA_BASS[(bar + 1) % SALSA_BASS.length] : SALSA_BASS[bar],
      "sine",
      0.3,
      0.3,
    );
  // conga tumbao: open tones on the "and" of four, a slap on two
  if (beat8 === 7) playKnock(ctx, dest, now, 330, 0.22, 0.18, 0.92);
  if (beat8 === 2) playKnock(ctx, dest, now, 520, 0.16, 0.06);
  // cowbell on the beat
  if (beat8 % 2 === 0) playKnock(ctx, dest, now, 800, 0.05, 0.08);
}

// Roller Disco: two bars each of Am7, Dm7, G and Cmaj7.
const DISCO_ROOTS = [110, 73.42, 98, 65.41];
const DISCO_CHORDS: readonly (readonly number[])[] = [
  [220, 261.63, 329.63, 392],
  [293.66, 349.23, 440, 523.25],
  [196, 246.94, 293.66, 392],
  [261.63, 329.63, 392, 493.88],
];

/** A short string stab: detuned saws through a soft lowpass. */
function playStab(
  ctx: AudioContext,
  dest: AnyNode,
  now: number,
  chord: readonly number[],
) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  filter.connect(gain);
  gain.connect(dest);
  for (const f of chord)
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, now);
      osc.detune.setValueAtTime(detune, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 0.3);
    }
}

export function rollerDiscoStep(
  ctx: AudioContext,
  dest: AnyNode,
  step: number,
  now: number,
) {
  const chordIndex = Math.floor(step / 16) % DISCO_ROOTS.length;
  const root = DISCO_ROOTS[chordIndex];
  // the bass walks root and octave on every eighth
  playBassNote(ctx, dest, now, step % 2 ? root * 2 : root);
  if (step % 2) {
    // the open hat on the offbeat: a longer, brighter hiss
    playHiHatHit(ctx, dest, now);
    playHiHatHit(ctx, dest, now + 0.03);
    return;
  }
  playKick(ctx, dest, now);
  const beat = (step / 2) % 4;
  if (beat === 1 || beat === 3) {
    playClap(ctx, dest, now);
    playStab(ctx, dest, now, DISCO_CHORDS[chordIndex]);
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
  "sugar-rush-pop": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: sugarRushPopStep,
  },
  "warehouse-acid": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: warehouseAcidStep,
  },
  "player-two-chiptune": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: playerTwoChiptuneStep,
  },
  "la-noche-salsa": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: laNocheSalsaStep,
  },
  "roller-disco": {
    stepSeconds: (bpm) => 60 / bpm / 2,
    step: rollerDiscoStep,
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
