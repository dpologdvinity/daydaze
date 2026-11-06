// The park band's sound: a brass-and-drum march band voiced in Web Audio from
// the arrangement in src/game/city/bandTunes.ts. `dueEvents` is the pure
// scheduler (which events fall in the next slice of the tune); `ParkBand`
// plays them through the shared SFX bus, louder the nearer you stand to the
// shell. Brass is a pair of detuned saws through a low-pass; the tuba a
// triangle; stabs short saws; the kick a falling sine; the snare filtered noise.

import type { BandEvent } from "../game/city/bandTunes.ts";
import { bandGain, type BandNow } from "../game/city/bandShell.ts";
import { getSharedAudioBus } from "./audioBus.ts";

/** How far ahead (seconds) events are handed to the audio clock. */
export const LOOKAHEAD = 0.6;

/**
 * The events from `cursor` on that start before `into + LOOKAHEAD` seconds
 * into the tune, each with its delay from now (negative: already late, skip
 * it), and the new cursor. `events` are sorted by beat.
 */
export function dueEvents(
  events: readonly BandEvent[],
  secondsPerBeat: number,
  cursor: number,
  into: number,
): { due: { event: BandEvent; delay: number }[]; cursor: number } {
  const due: { event: BandEvent; delay: number }[] = [];
  let i = cursor;
  while (i < events.length) {
    const event = events[i];
    if (!event) break;
    const t = event.beat * secondsPerBeat;
    if (t >= into + LOOKAHEAD) break;
    if (t >= into - 0.05) due.push({ event, delay: Math.max(0, t - into) });
    i += 1;
  }
  return { due, cursor: i };
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  at: number,
  hz: number,
  length: number,
  type: OscillatorType[],
  cutoff: number,
  level: number,
): void {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.03);
  gain.gain.setValueAtTime(level, at + Math.max(0.04, length - 0.08));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  filter.connect(gain);
  gain.connect(dest);
  type.forEach((t, k) => {
    const osc = ctx.createOscillator();
    osc.type = t;
    osc.frequency.value = hz;
    osc.detune.value = k === 0 ? -6 : 6;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.02);
  });
}

function drum(ctx: AudioContext, dest: AudioNode, at: number, kick: boolean) {
  const gain = ctx.createGain();
  gain.connect(dest);
  if (kick) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    gain.gain.setValueAtTime(0.5, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + 0.2);
    return;
  }
  const samples = Math.floor(ctx.sampleRate * 0.1);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(0.22, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
  noise.connect(filter);
  filter.connect(gain);
  noise.start(at);
}

/** Voices one event at audio time `at`; `spb` is seconds a beat. */
export function playBandEvent(
  ctx: AudioContext,
  dest: AudioNode,
  e: BandEvent,
  at: number,
  spb: number,
): void {
  const length = Math.max(0.12, e.beats * spb);
  if (e.part === "kick") drum(ctx, dest, at, true);
  else if (e.part === "snare") drum(ctx, dest, at, false);
  else if (e.part === "lead")
    tone(
      ctx,
      dest,
      at,
      freq(e.midi[0] ?? 60),
      length,
      ["sawtooth", "square"],
      2600,
      0.11,
    );
  else if (e.part === "bass")
    tone(ctx, dest, at, freq(e.midi[0] ?? 40), length, ["triangle"], 700, 0.3);
  else
    for (const m of e.midi)
      tone(ctx, dest, at, freq(m), length, ["sawtooth"], 1500, 0.035);
}

/**
 * Plays whatever tune `BandNow` says is on, at a volume that follows the
 * listener's distance. Call `update` about ten times a second; `stop` when
 * the player leaves the city.
 */
export class ParkBand {
  private master: GainNode | null = null;
  private key = "";
  private cursor = 0;

  private ensure(): { ctx: AudioContext; master: GainNode } | null {
    const bus = getSharedAudioBus();
    const ctx = bus.getContext();
    const dest = bus.getSfxDestination();
    if (!ctx || !dest) return null;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(dest);
    }
    return { ctx, master: this.master };
  }

  update(now: BandNow, distance: number): void {
    const gain = now.playing ? bandGain(distance) : 0;
    if (gain <= 0 || !now.playing) {
      if (this.master) this.master.gain.value = 0;
      // a tune we walked away from starts over where it is, not where it was
      this.key = "";
      return;
    }
    const audio = this.ensure();
    if (!audio) return;
    if (audio.ctx.state === "suspended")
      void audio.ctx.resume().catch(() => {});
    audio.master.gain.value = gain;
    const key = `${now.setStart}:${now.index}`;
    if (key !== this.key) {
      this.key = key;
      this.cursor = 0;
    }
    const spb = 60 / now.tune.song.bpm;
    const { due, cursor } = dueEvents(
      now.tune.events,
      spb,
      this.cursor,
      now.into,
    );
    this.cursor = cursor;
    for (const { event, delay } of due)
      playBandEvent(
        audio.ctx,
        audio.master,
        event,
        audio.ctx.currentTime + delay,
        spb,
      );
  }

  stop(): void {
    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    this.key = "";
  }
}
