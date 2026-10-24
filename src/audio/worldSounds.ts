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

/** A car horn: two square tones a third apart, the classic "meep". */
export function playHorn(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.setValueAtTime(0.12, now + 0.32);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  filter.connect(gain).connect(dest);
  for (const hz of [415, 523]) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(hz, now);
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + 0.42);
  }
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

/** A cat's purr: low rumbling noise pulsing about 25 times a second, in on
 * a breath and out on the next, for `seconds`. */
export function playPurr(seconds: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const end = now + Math.max(0.8, Math.min(seconds, 4));
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(180, now);
  const pulse = ctx.createGain();
  pulse.gain.setValueAtTime(0.5, now);
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(25, now);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0.5, now);
  lfo.connect(depth).connect(pulse.gain);
  const breath = ctx.createGain();
  breath.gain.setValueAtTime(0.0001, now);
  for (let t = now; t < end; t += 1.8) {
    breath.gain.exponentialRampToValueAtTime(0.35, Math.min(t + 0.8, end));
    breath.gain.exponentialRampToValueAtTime(0.12, Math.min(t + 1.8, end));
  }
  breath.gain.exponentialRampToValueAtTime(0.0001, end + 0.1);
  source.connect(filter).connect(pulse).connect(breath).connect(dest);
  source.start(now);
  lfo.start(now);
  source.stop(end + 0.15);
  lfo.stop(end + 0.15);
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

/** Something hitting a hot wok: a crackling hiss that settles. */
export function playSizzle(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const fry = ctx.createBufferSource();
  fry.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
  fry.connect(hp).connect(gain).connect(dest);
  fry.start(now, Math.random() * 0.5);
  fry.stop(now + 1.35);
  // a few pops of fat
  for (let i = 0; i < 5; i++) {
    const at = now + 0.05 + Math.random() * 0.8;
    const pop = ctx.createOscillator();
    const g = ctx.createGain();
    pop.type = "square";
    pop.frequency.setValueAtTime(1800 + Math.random() * 1500, at);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.setValueAtTime(0.03, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.015);
    pop.connect(g).connect(dest);
    pop.start(at);
    pop.stop(at + 0.02);
  }
  return true;
}

/** A knife on a board: a sharp knock with a woody body. */
export function playChop(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  burst(ctx, dest, "bandpass", 2600, 0.18, 0.04);
  const body = ctx.createOscillator();
  const gain = ctx.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(320, now);
  body.frequency.exponentialRampToValueAtTime(140, now + 0.06);
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  body.connect(gain).connect(dest);
  body.start(now);
  body.stop(now + 0.09);
  return true;
}

/** A gong for the result: a low inharmonic bloom that rings out. */
export function playGong(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  for (const [f, level, decay] of [
    [98, 0.2, 4],
    [146.8, 0.1, 3],
    [207.5, 0.07, 2.4],
    [311, 0.04, 1.6],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f * 1.01, now);
    osc.frequency.exponentialRampToValueAtTime(f, now + 0.6);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
  return true;
}

/** A water pistol's squirt: a short hiss that bends up as the jet leaves. */
export function playSquirt(): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  const jet = ctx.createBufferSource();
  jet.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 3;
  band.frequency.setValueAtTime(1800, now);
  band.frequency.exponentialRampToValueAtTime(3600, now + 0.14);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  jet.connect(band).connect(gain).connect(dest);
  jet.start(now, Math.random() * 1.5);
  jet.stop(now + 0.22);
  return true;
}

/**
 * Something hitting water: a bright slap, then a hiss of falling drops. `size`
 * (0..2) scales it: a ball's plop at 0.3, a neat dive entry at 0.6, a belly
 * flop at 2.
 */
export function playSplash(size: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const k = Math.min(2, Math.max(0.1, size));
  const now = ctx.currentTime;
  // the slap: a short low-mid noise burst
  burst(ctx, dest, "lowpass", 900 + k * 500, 0.12 + k * 0.1, 0.12 + k * 0.05);
  // the drops: highpassed noise that swells a touch and falls away
  const drops = ctx.createBufferSource();
  drops.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const gain = ctx.createGain();
  const tail = 0.35 + k * 0.45;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05 + k * 0.05, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tail);
  drops.connect(hp).connect(gain).connect(dest);
  drops.start(now, Math.random() * 1.2);
  drops.stop(now + tail + 0.02);
  return true;
}

/** A ball struck by hand or forearm: a soft low thump with a slap on top;
 * `level` (0..1) is how hard. */
export function playThump(level: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const k = Math.min(1, Math.max(0.2, level));
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(170, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
  gain.gain.setValueAtTime(0.32 * k, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.18);
  burst(ctx, dest, "bandpass", 1600, 0.12 * k, 0.05);
  return true;
}

/**
 * A small crowd cheering: a swell of filtered noise (the roar) under a few
 * rising "woo"s. `level` (0..1) scales how big the crowd sounds.
 */
export function playCheer(level: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const k = Math.min(1, Math.max(0.2, level));
  const now = ctx.currentTime;
  const roar = ctx.createBufferSource();
  roar.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100;
  band.Q.value = 0.6;
  const swell = ctx.createGain();
  swell.gain.setValueAtTime(0.0001, now);
  swell.gain.exponentialRampToValueAtTime(0.16 * k, now + 0.25);
  swell.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  roar.connect(band).connect(swell).connect(dest);
  roar.start(now, Math.random() * 0.4);
  roar.stop(now + 1.65);
  for (let i = 0; i < 2 + Math.round(k * 3); i++) {
    const at = now + 0.05 + Math.random() * 0.5;
    const from = 380 + Math.random() * 260;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(from * 1.6, at + 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.04 * k, at + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    osc.connect(gain).connect(dest);
    osc.start(at);
    osc.stop(at + 0.55);
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
