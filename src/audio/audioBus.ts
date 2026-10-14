/**
 * Shared Web Audio routing: one AudioContext, one master gain, and
 * independent Music/SFX buses beneath it. All procedural audio producers
 * (jukebox, instruments, dance floor, minigames) connect to the music or
 * SFX destination here instead of talking to `ctx.destination` directly, so
 * a single global mute/volume control can reach every audio path.
 */

export type AudioChannel = "music" | "sfx";

export interface AudioBus {
  /** Underlying AudioContext, or null if Web Audio is unavailable. */
  getContext(): AudioContext | null;
  /** Node producers should connect into for music (jukebox tracks). */
  getMusicDestination(): AudioNode | null;
  /** Node producers should connect into for sound effects (instruments, UI, minigames). */
  getSfxDestination(): AudioNode | null;

  setMasterVolume(vol: number): void;
  getMasterVolume(): number;
  setMasterMuted(muted: boolean): void;
  isMasterMuted(): boolean;

  setMusicMuted(muted: boolean): void;
  isMusicMuted(): boolean;
  setSfxMuted(muted: boolean): void;
  isSfxMuted(): boolean;

  /** Effective linear gain currently applied to the music bus (for tests/inspection). */
  getMusicGainValue(): number;
  /** Effective linear gain currently applied to the SFX bus (for tests/inspection). */
  getSfxGainValue(): number;

  dispose(): void;
}

function clampUnit(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function getAudioContextClass(): typeof AudioContext | undefined {
  return (
    (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ||
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

class AudioBusImpl implements AudioBus {
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterVolume = 1;
  private masterMuted = false;
  private musicMuted = false;
  private sfxMuted = false;
  private disposed = false;

  constructor(ctx: AudioContext | null) {
    this.ctx = ctx;
    if (!ctx) return;
    try {
      this.master = ctx.createGain();
      this.musicGain = ctx.createGain();
      this.sfxGain = ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(ctx.destination);
      this.applyGains();
    } catch {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
    }
  }

  getContext(): AudioContext | null {
    return this.disposed ? null : this.ctx;
  }

  getMusicDestination(): AudioNode | null {
    return this.disposed ? null : this.musicGain;
  }

  getSfxDestination(): AudioNode | null {
    return this.disposed ? null : this.sfxGain;
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = clampUnit(vol, this.masterVolume);
    this.applyGains();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
    this.applyGains();
  }

  isMasterMuted(): boolean {
    return this.masterMuted;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.applyGains();
  }

  isMusicMuted(): boolean {
    return this.musicMuted;
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.applyGains();
  }

  isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  getMusicGainValue(): number {
    return this.musicGain?.gain.value ?? 0;
  }

  getSfxGainValue(): number {
    return this.sfxGain?.gain.value ?? 0;
  }

  private applyGains(): void {
    try {
      if (this.master) {
        this.master.gain.value = this.masterMuted ? 0 : this.masterVolume;
      }
      if (this.musicGain) {
        this.musicGain.gain.value = this.musicMuted ? 0 : 1;
      }
      if (this.sfxGain) {
        this.sfxGain.gain.value = this.sfxMuted ? 0 : 1;
      }
    } catch {
      /* ignore: node may be disconnected in exotic test doubles */
    }
  }

  dispose(): void {
    if (this.disposed) return;
    try {
      this.musicGain?.disconnect();
      this.sfxGain?.disconnect();
      this.master?.disconnect();
    } catch {
      /* ignore */
    }
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
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

/** Creates an isolated bus; mainly for tests. Production code uses {@link getSharedAudioBus}. */
export function createAudioBus(ctx?: AudioContext | null): AudioBus {
  return new AudioBusImpl(resolveAudioContext(ctx));
}

let sharedBus: AudioBus | null = null;

/** Lazily creates the single AudioBus shared by every audio-producing feature. */
export function getSharedAudioBus(): AudioBus {
  if (!sharedBus) sharedBus = createAudioBus();
  return sharedBus;
}

/** Test-only: forces the next {@link getSharedAudioBus} call to build a fresh bus. */
export function resetSharedAudioBusForTests(): void {
  sharedBus?.dispose();
  sharedBus = null;
}
