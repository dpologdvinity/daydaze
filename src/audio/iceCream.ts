// Public-domain French melody Ah! vous dirai-je, maman (Twinkle Twinkle),
// short music-box phrases synthesized through the shared, muteable SFX bus.
import { getSharedAudioBus } from "./audioBus.ts";
const NOTES = [
  60,
  60,
  67,
  67,
  69,
  69,
  67,
  null,
  65,
  65,
  64,
  64,
  62,
  62,
  60,
  null,
] as const;
export function jingleLevel(distance: number): number {
  return Number.isFinite(distance) && distance >= 0 && distance < 60
    ? 0.08 * (1 - distance / 60) ** 2
    : 0;
}
export function jingleNote(seconds: number): number | null {
  const step = Math.floor((seconds + 1e-8) / 0.4);
  return NOTES[((step % NOTES.length) + NOTES.length) % NOTES.length];
}
export function playIceCreamNote(note: number, level: number): boolean {
  if (!Number.isFinite(note) || !Number.isFinite(level) || level <= 0)
    return false;
  try {
    const bus = getSharedAudioBus();
    const ctx = bus.getContext(),
      dest = bus.getSfxDestination();
    if (!ctx || !dest || ctx.state !== "running") return false;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(Math.min(0.08, level), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);
    oscillator.connect(gain).connect(dest);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + 0.35);
    return true;
  } catch {
    return false;
  }
}
