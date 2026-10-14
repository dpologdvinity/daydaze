import { getSharedAudioBus } from "./audioBus.ts";

export type InstrumentType = "piano" | "marimba" | "drums" | "floor_piano";

/** C major pentatonic room scale, C4 through E5 (8 notes). */
export const PENTATONIC_FREQUENCIES: readonly number[] = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25,
];

/** Same pentatonic shape, one octave down (C3 through E4) for the floor piano. */
export const FLOOR_PIANO_FREQUENCIES: readonly number[] =
  PENTATONIC_FREQUENCIES.map((hz) => hz / 2);

export const NOTE_NAMES: readonly string[] = [
  "C4",
  "D4",
  "E4",
  "G4",
  "A4",
  "C5",
  "D5",
  "E5",
];

export const DRUM_LABELS: readonly string[] = [
  "Kick",
  "Snare",
  "Hi-Hat",
  "Low Bongo",
  "High Bongo",
  "Crash",
  "Clave",
  "Open Hat",
];

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  piano: "Piano",
  marimba: "Marimba",
  drums: "Drums",
  floor_piano: "Floor Piano",
};

function isValidNoteIndex(noteIndex: number): boolean {
  return Number.isInteger(noteIndex) && noteIndex >= 0 && noteIndex <= 7;
}

/** Pitch for a note index, or null for percussive instruments / out-of-range input. */
export function noteFrequency(
  instrument: InstrumentType,
  noteIndex: number,
): number | null {
  if (!isValidNoteIndex(noteIndex)) return null;
  if (instrument === "drums") return null;
  if (instrument === "floor_piano") return FLOOR_PIANO_FREQUENCIES[noteIndex];
  return PENTATONIC_FREQUENCIES[noteIndex];
}

function getAudioContextClass(): typeof AudioContext | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

let sharedCtx: AudioContext | null = null;

function resolveContext(ctx?: AudioContext | null): AudioContext | null {
  if (ctx) return ctx;
  const busCtx = getSharedAudioBus().getContext();
  if (busCtx) return busCtx;
  if (sharedCtx) return sharedCtx;
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  sharedCtx = new AudioContextClass();
  return sharedCtx;
}

/** SFX destination for the resolved context: the shared bus's SFX bus when available. */
function resolveSfxDestination(audioCtx: AudioContext): AudioNode {
  const bus = getSharedAudioBus();
  if (bus.getContext() === audioCtx) {
    const sfxDest = bus.getSfxDestination();
    if (sfxDest) return sfxDest;
  }
  return audioCtx.destination;
}

function whiteNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Sine + subtle triangle harmonic, exponential decay (tau ~0.4s). */
function playPiano(ctx: AudioContext, dest: AudioNode, frequency: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const harmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const harmonicGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  harmonic.type = "triangle";
  harmonic.frequency.setValueAtTime(frequency * 2, now);
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  harmonicGain.gain.setValueAtTime(0.15, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(dest);
  harmonic.connect(harmonicGain);
  harmonicGain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.4);
  harmonic.start(now);
  harmonic.stop(now + 0.3);
}

/** Wooden resonant strike with warm overtone, short release (tau ~0.25s). */
function playMarimba(ctx: AudioContext, dest: AudioNode, frequency: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  const overtoneGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  overtone.type = "sine";
  overtone.frequency.setValueAtTime(frequency * 3.2, now);
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  overtoneGain.gain.setValueAtTime(0.2, now);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(dest);
  overtone.connect(overtoneGain);
  overtoneGain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.25);
  overtone.start(now);
  overtone.stop(now + 0.08);
}

/** Deeper octave rich sawtooth/sine hybrid with a gentle warm filter. */
function playFloorPiano(ctx: AudioContext, dest: AudioNode, frequency: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const saw = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(frequency, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(filter);
  saw.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.5);
  saw.start(now);
  saw.stop(now + 0.5);
}

function playKick(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playSnare(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.2);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(dest);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(180, now);
  bodyGain.gain.setValueAtTime(0.4, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  body.connect(bodyGain);
  bodyGain.connect(dest);

  noise.start(now);
  body.start(now);
  body.stop(now + 0.12);
}

function playHiHat(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playBongo(
  ctx: AudioContext,
  dest: AudioNode,
  frequency: number,
  tau: number,
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, now + tau);
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + tau);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + tau);
}

function playCrash(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.5);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 5000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

function playClave(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.08);
}

function playOpenHat(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuffer(ctx, 0.2);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  noise.start(now);
}

const DRUM_PLAYERS: ReadonlyArray<
  (ctx: AudioContext, dest: AudioNode) => void
> = [
  playKick,
  playSnare,
  playHiHat,
  (ctx, dest) => playBongo(ctx, dest, 220, 0.3),
  (ctx, dest) => playBongo(ctx, dest, 330, 0.2),
  playCrash,
  playClave,
  playOpenHat,
];

/**
 * Plays a synthesized note/hit for the given instrument. Returns false (never
 * throws) if audio is unavailable, the index is invalid, or playback fails.
 * Routes through the shared AudioBus SFX destination when no explicit `ctx`
 * is supplied, so the global SFX mute/volume control reaches instruments.
 */
export function playInstrumentNote(
  instrument: InstrumentType,
  noteIndex: number,
  ctx?: AudioContext | null,
): boolean {
  if (!isValidNoteIndex(noteIndex)) return false;
  try {
    const audioCtx = resolveContext(ctx);
    if (!audioCtx) return false;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    const dest = ctx ? ctx.destination : resolveSfxDestination(audioCtx);
    if (instrument === "drums") {
      DRUM_PLAYERS[noteIndex](audioCtx, dest);
      return true;
    }
    const frequency = noteFrequency(instrument, noteIndex);
    if (frequency === null) return false;
    if (instrument === "piano") playPiano(audioCtx, dest, frequency);
    else if (instrument === "marimba") playMarimba(audioCtx, dest, frequency);
    else playFloorPiano(audioCtx, dest, frequency);
    return true;
  } catch {
    return false;
  }
}
