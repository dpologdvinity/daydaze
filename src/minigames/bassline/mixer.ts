/**
 * Bassline backing groove: procedural Web Audio DJ mixer ported from Club
 * Lion. Plays through the shared audio bus music channel so the global
 * mute and volume reach it; does nothing when Web Audio is unavailable.
 */

import { getSharedAudioBus } from "../../audio/audioBus.ts";

export interface DJState {
  bpm: number;
  isPlaying: boolean;
  crossfader: number; // 0 (Deck A / Bass Groove) to 1 (Deck B / Neon Arp)
  filterCutoff: number; // 100Hz to 3000Hz
  bassMuted: boolean;
  drumsMuted: boolean;
  leadMuted: boolean;
}

export const DEFAULT_DJ_STATE: DJState = {
  bpm: 128,
  isPlaying: false,
  crossfader: 0.5,
  filterCutoff: 1800,
  bassMuted: false,
  drumsMuted: false,
  leadMuted: false,
};

// Pentatonic minor scale notes in Hz (C3 to C5)
export const SCALE_FREQUENCIES: number[] = [
  130.81, // C3
  155.56, // Eb3
  174.61, // F3
  196.0, // G3
  233.08, // Bb3
  261.63, // C4
  311.13, // Eb4
  349.23, // F4
  392.0, // G4
  466.16, // Bb4
  523.25, // C5
];

export class DJMixerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private timerId: number | null = null;
  private step: number = 0;
  private state: DJState = { ...DEFAULT_DJ_STATE };

  constructor(customCtx?: AudioContext | null) {
    if (customCtx) {
      this.ctx = customCtx;
      this.initNodes();
    }
  }

  private initNodes(): void {
    if (!this.ctx || this.masterGain) return;
    try {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(
        this.state.filterCutoff,
        this.ctx.currentTime,
      );
      this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.filterNode.connect(this.masterGain);
      const bus = getSharedAudioBus();
      const musicDest =
        bus.getContext() === this.ctx ? bus.getMusicDestination() : null;
      this.masterGain.connect(musicDest ?? this.ctx.destination);
    } catch {
      // Safe fallback
    }
  }

  private ensureAudioContext(): boolean {
    // The bus swallows AudioContext construction failures and returns null.
    this.ctx ??= getSharedAudioBus().getContext();
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.initNodes();
    return !!this.ctx;
  }

  public getState(): DJState {
    return { ...this.state };
  }

  public setBpm(bpm: number): void {
    this.state.bpm = Math.max(90, Math.min(160, bpm));
    if (this.state.isPlaying) {
      this.restartTimer();
    }
  }

  public setFilterCutoff(hz: number): void {
    this.state.filterCutoff = Math.max(100, Math.min(4000, hz));
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setTargetAtTime(
        this.state.filterCutoff,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public setCrossfader(val: number): void {
    this.state.crossfader = Math.max(0, Math.min(1, val));
  }

  public toggleMute(track: "bass" | "drums" | "lead"): void {
    if (track === "bass") this.state.bassMuted = !this.state.bassMuted;
    if (track === "drums") this.state.drumsMuted = !this.state.drumsMuted;
    if (track === "lead") this.state.leadMuted = !this.state.leadMuted;
  }

  public start(): void {
    if (this.state.isPlaying) return;
    if (!this.ensureAudioContext()) return;

    this.state.isPlaying = true;
    this.step = 0;
    // Play step 0 now so kicks land on the beat, not one 16th late.
    this.tick();
    this.restartTimer();
  }

  public stop(): void {
    this.state.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private restartTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // 16th note interval = (60 / bpm) / 4 * 1000 ms
    const intervalMs = (60 / this.state.bpm / 4) * 1000;
    // shortcut: setInterval drifts a few ms per bar; schedule ahead on ctx.currentTime if sets get longer than ~30s.
    this.timerId = Number(setInterval(() => this.tick(), intervalMs));
  }

  private tick(): void {
    if (!this.ctx || !this.filterNode) return;
    const t = this.ctx.currentTime;
    const s = this.step % 16;

    const deckAVol = 1 - this.state.crossfader;
    const deckBVol = this.state.crossfader;

    // 1. Kick Drum (Every 4 steps: 0, 4, 8, 12)
    if (!this.state.drumsMuted && s % 4 === 0) {
      this.playKick(t, deckAVol);
    }

    // 2. Hi-Hat (Offbeats: 2, 6, 10, 14)
    if (!this.state.drumsMuted && (s % 2 === 1 || s % 4 === 2)) {
      this.playHiHat(t, deckAVol * 0.7);
    }

    // 3. Bass Groove (Deck A)
    if (!this.state.bassMuted && s % 2 === 0) {
      const bassFreq = s < 8 ? 65.41 : 77.78; // C2 / Eb2
      this.playBass(t, bassFreq, deckAVol);
    }

    // 4. Arpeggiator Lead (Deck B)
    if (!this.state.leadMuted) {
      const noteIdx = (s * 3) % SCALE_FREQUENCIES.length;
      const freq = SCALE_FREQUENCIES[noteIdx];
      this.playArp(t, freq, deckBVol);
    }

    this.step = (this.step + 1) % 16;
  }

  private playKick(t: number, volume: number): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    gain.gain.setValueAtTime(0.3 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.14);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playHiHat(t: number, volume: number): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(8000, t);

    gain.gain.setValueAtTime(0.06 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playBass(t: number, freq: number, volume: number): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.2 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.18);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playArp(t: number, freq: number, volume: number): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.15 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.12);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Procedural Airhorn FX Blast!
   */
  public triggerAirhorn(): void {
    if (!this.ensureAudioContext() || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const freqs = [466.16, 523.25, 587.33]; // Bb4, C5, D5 brass chord

    freqs.forEach((f) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.05, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(f * 0.95, t + 0.25);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.35);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  public dispose(): void {
    this.stop();
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Safe release
      }
    }
  }
}
