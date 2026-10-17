/**
 * The world's sounds, all synthesized: footsteps, a whoosh through doors, a
 * soft UI tick, and looping ambience beds (city hum, surf, aquarium bubbles,
 * haunted wind, rink air). Routes through the shared audio bus SFX channel
 * so the global mute reaches it. Nothing here throws when audio is missing.
 */

import { getSharedAudioBus } from "./audioBus.ts";

export type Ambience = "city" | "beach" | "aquarium" | "rink" | "haunted";
export type Surface = "hard" | "soft";

function sfx(): { ctx: AudioContext; dest: AudioNode } | null {
  try {
    const bus = getSharedAudioBus();
    const ctx = bus.getContext();
    const dest = bus.getSfxDestination();
    if (!ctx || !dest || ctx.state !== "running") return null;
    return { ctx, dest };
  } catch {
    return null;
  }
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

/** Two seconds of white noise per context, made once and looped or sliced. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    const length = ctx.sampleRate * 2;
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function burst(
  ctx: AudioContext,
  dest: AudioNode,
  type: BiquadFilterType,
  frequency: number,
  level: number,
  seconds: number,
) {
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(filter).connect(gain).connect(dest);
  source.start(now, Math.random() * 1.5);
  source.stop(now + seconds + 0.02);
}

/** One footstep: a short low tap on floors, a softer scuff on sand or grass. */
export function playStep(surface: Surface = "hard"): boolean {
  const out = sfx();
  if (!out) return false;
  const pitch = 0.85 + Math.random() * 0.3;
  if (surface === "hard") {
    burst(out.ctx, out.dest, "lowpass", 900 * pitch, 0.09, 0.07);
  } else {
    burst(out.ctx, out.dest, "bandpass", 1600 * pitch, 0.05, 0.12);
  }
  return true;
}

/** A skate's push: a low rolling hiss of wheels on the ground. */
export function playGlide(): boolean {
  const out = sfx();
  if (!out) return false;
  burst(out.ctx, out.dest, "bandpass", 380 + Math.random() * 120, 0.07, 0.32);
  return true;
}

/** Through a door: noise swept up then down, like air rushing past. */
export function playWhoosh(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(1.2, now);
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.25);
  filter.frequency.exponentialRampToValueAtTime(400, now + 0.6);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  source.connect(filter).connect(gain).connect(dest);
  source.start(now);
  source.stop(now + 0.7);
  return true;
}

/** A soft glassy tick for buttons. */
export function playClick(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1760, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.09);
  return true;
}

/** A prize fanfare: a rising major arpeggio, brighter for a better grade
 * (`level` 0..1), with a sparkle of noise on top. */
export function playFanfare(level: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  // C E G C', and a high E for the top grades
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  const count = 3 + Math.round(Math.max(0, Math.min(1, level)) * 2);
  for (let i = 0; i < count; i++) {
    const at = now + i * 0.09;
    const last = i === count - 1;
    const hold = last ? 0.6 : 0.16;
    for (const type of ["square", "triangle"] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(notes[i], at);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setValueAtTime(type === "square" ? 0.025 : 0.06, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + hold);
      osc.connect(gain).connect(dest);
      osc.start(at);
      osc.stop(at + hold + 0.02);
    }
  }
  burst(ctx, dest, "highpass", 6000, 0.05, 0.5);
  return true;
}

/** A firework bursting far off: a low thump and a crackle, `level` 0..1 by
 * how near it is. */
export function playFireworkBoom(level: number): boolean {
  const out = sfx();
  if (!out || level <= 0) return false;
  const { ctx, dest } = out;
  const l = Math.min(1, level);
  burst(ctx, dest, "lowpass", 160, 0.5 * l, 0.9);
  burst(ctx, dest, "bandpass", 2400, 0.08 * l, 1.4);
  return true;
}

/** The singing shells' notes: a bell-like tone on a pentatonic step
 * (shell 0..3), or a sour low chord for a wrong note (`shell` -1). */
export function playShellNote(shell: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const tones =
    shell < 0 ? [196, 207.65] : [[523.25, 587.33, 659.25, 783.99][shell % 4]];
  for (const f of tones)
    for (const [mult, level] of [
      [1, 0.09],
      [2, 0.03],
      [3.01, 0.015],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f * mult, now);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + (shell < 0 ? 0.6 : 1.2),
      );
      osc.connect(gain).connect(dest);
      osc.start(now);
      osc.stop(now + 1.25);
    }
  return true;
}

/** A bowling ball rolling down the lane: a low rumble for `seconds`,
 * swelling as it goes. */
export function playBowlRoll(seconds: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const end = now + Math.max(0.3, Math.min(seconds, 4));
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(140, now);
  filter.frequency.linearRampToValueAtTime(220, end);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.25);
  gain.gain.setValueAtTime(0.3, end - 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter).connect(gain).connect(dest);
  source.start(now);
  source.stop(end + 0.05);
  return true;
}

/** Pins going down: a wooden clatter, fuller and longer the more fall. */
export function playPinCrash(pins: number): boolean {
  const out = sfx();
  if (!out || pins <= 0) return false;
  const { ctx, dest } = out;
  const n = Math.min(10, pins);
  const now = ctx.currentTime;
  // the hit itself, then a scatter of clacks as pins knock each other
  burst(ctx, dest, "bandpass", 900, 0.35, 0.18);
  for (let i = 0; i < n + 2; i++) {
    const at = now + 0.02 + Math.random() * (0.15 + n * 0.05);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(700 + Math.random() * 900, at);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.09, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(gain).connect(dest);
    osc.start(at);
    osc.stop(at + 0.08);
  }
  return true;
}

/** How each bed is built: filtered looping noise, slowly swelling, plus
 * an optional low drone. */
const BEDS: Record<
  Ambience,
  {
    type: BiquadFilterType;
    frequency: number;
    level: number;
    /** Swell rate (Hz) and depth (0..1) of the noise's level. */
    swell: [number, number];
    drone?: number;
  }
> = {
  city: { type: "lowpass", frequency: 380, level: 0.08, swell: [0.07, 0.3] },
  beach: { type: "lowpass", frequency: 900, level: 0.12, swell: [0.11, 0.85] },
  aquarium: {
    type: "lowpass",
    frequency: 260,
    level: 0.1,
    swell: [0.05, 0.4],
    drone: 55,
  },
  rink: { type: "highpass", frequency: 2500, level: 0.025, swell: [0.04, 0.4] },
  haunted: {
    type: "bandpass",
    frequency: 520,
    level: 0.07,
    swell: [0.09, 0.9],
    drone: 41,
  },
};

/**
 * Starts a looping ambience bed; returns a function that fades it out.
 * Returns a no-op when audio is unavailable or not yet unlocked.
 */
export function startAmbience(kind: Ambience): () => void {
  const out = sfx();
  if (!out) return () => {};
  try {
    const { ctx, dest } = out;
    const bed = BEDS[kind];
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(bed.level, now + 1.5);
    master.connect(dest);

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = bed.type;
    filter.frequency.setValueAtTime(bed.frequency, now);
    const swell = ctx.createGain();
    swell.gain.setValueAtTime(1 - bed.swell[1] / 2, now);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(bed.swell[0], now);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(bed.swell[1] / 2, now);
    lfo.connect(depth).connect(swell.gain);
    source.connect(filter).connect(swell).connect(master);
    source.start(now);
    lfo.start(now);
    const nodes: AudioScheduledSourceNode[] = [source, lfo];

    if (bed.drone) {
      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.setValueAtTime(bed.drone, now);
      const level = ctx.createGain();
      level.gain.setValueAtTime(0.5, now);
      drone.connect(level).connect(master);
      drone.start(now);
      nodes.push(drone);
    }

    return () => {
      try {
        const end = ctx.currentTime;
        master.gain.cancelScheduledValues(end);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), end);
        master.gain.exponentialRampToValueAtTime(0.0001, end + 0.8);
        for (const n of nodes) n.stop(end + 0.85);
      } catch {
        // already stopped
      }
    };
  } catch {
    return () => {};
  }
}

/** Resumes the shared audio context; browsers allow it only in a gesture. */
export function unlockAudio(): void {
  try {
    const ctx = getSharedAudioBus().getContext();
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    // no audio here
  }
}
