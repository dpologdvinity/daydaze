/**
 * Bar sound effects for Last Call, all synthesized: a liquid pour, an
 * ice-filled shaker rattle and a service bell. Routes through the shared
 * audio bus SFX channel so the global mute and volume reach it.
 */

import { getSharedAudioBus } from "./audioBus.ts";

export type BarSound = "pour" | "shake" | "ding";

function noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

/** Band-passed noise whose centre wobbles down, like liquid glugging out. */
function playPour(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const source = noise(ctx, 0.45);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(6, now);
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(now);
  source.stop(now + 0.45);
}

/** Six bright noise ticks, a shaker full of ice. */
function playShake(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const at = now + i * 0.1;
    const source = noise(ctx, 0.06);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(i % 2 ? 3200 : 2400, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(at);
    source.stop(at + 0.06);
  }
}

/** Two sine partials with a long decay: the bell on the bar. */
function playDing(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  for (const [frequency, level] of [
    [1318.5, 0.22],
    [3296, 0.06],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 1.25);
  }
}

const PLAYERS: Record<BarSound, (ctx: AudioContext, dest: AudioNode) => void> =
  { pour: playPour, shake: playShake, ding: playDing };

/**
 * Plays a bar sound. Returns false (never throws) when audio is unavailable
 * or playback fails. An explicit `ctx` plays straight to its destination.
 */
export function playBarSound(
  sound: BarSound,
  ctx?: AudioContext | null,
): boolean {
  try {
    const bus = getSharedAudioBus();
    const audioCtx = ctx === undefined ? bus.getContext() : ctx;
    if (!audioCtx) return false;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    const dest = ctx ? ctx.destination : bus.getSfxDestination();
    if (!dest) return false;
    PLAYERS[sound](audioCtx, dest);
    return true;
  } catch {
    return false;
  }
}
