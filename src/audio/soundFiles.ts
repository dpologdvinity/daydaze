// Lazy file playback through the shared SFX bus; no requests before unlock.
import { getSharedAudioBus } from "./audioBus.ts";
import { isMusicBed, type AmbienceId } from "./ambience.ts";

const buffers = new Map<string, Promise<AudioBuffer>>();
async function load(id: string, ctx: AudioContext): Promise<AudioBuffer> {
  let promise = buffers.get(id);
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}audio/${id}.ogg`)
      .then((r) => {
        if (r.ok) return r.arrayBuffer();
        return fetch(`${import.meta.env.BASE_URL}audio/${id}.mp3`).then(
          (fallback) => {
            if (!fallback.ok)
              throw new Error(`Audio ${id}: ${fallback.status}`);
            return fallback.arrayBuffer();
          },
        );
      })
      .then((data) => ctx.decodeAudioData(data));
    buffers.set(id, promise);
    promise.catch(() => buffers.delete(id));
  }
  return promise;
}
const active = new Map<
  AmbienceId,
  { source: AudioBufferSourceNode; gain: GainNode }
>();
let generation = 0;
export async function setFileAmbience(
  levels: Partial<Record<AmbienceId, number>>,
): Promise<void> {
  const token = ++generation;
  const bus = getSharedAudioBus();
  const ctx = bus.getContext();
  const sfx = bus.getSfxDestination();
  const music = bus.getMusicDestination();
  if (!ctx || !sfx || !music || ctx.state !== "running") return;
  for (const [id, node] of active) {
    const level = levels[id] ?? 0;
    node.gain.gain.cancelScheduledValues(ctx.currentTime);
    node.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.5);
    if (!level) {
      node.source.stop(ctx.currentTime + 3);
      active.delete(id);
    }
  }
  await Promise.all(
    Object.entries(levels).map(async ([key, level]) => {
      const id = key as AmbienceId;
      if (!level || active.has(id)) return;
      try {
        const buffer = await load(id, ctx);
        if (token !== generation || active.has(id)) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain).connect(isMusicBed(id) ? music : sfx);
        gain.gain.setTargetAtTime(level, ctx.currentTime, 0.5);
        source.start();
        active.set(id, { source, gain });
      } catch {
        /* Missing audio should never interrupt the game. */
      }
    }),
  );
}
/** One-shot files; `gain` (0..1) turns a far-off sound down. */
export async function playSoundFile(
  id: "door" | "horn" | "coin" | "camera" | "elephant" | "lion" | "flamingos",
  gain = 1,
): Promise<void> {
  const bus = getSharedAudioBus();
  const ctx = bus.getContext();
  const dest = bus.getSfxDestination();
  if (!ctx || !dest || ctx.state !== "running") return;
  try {
    const buffer = await load(id, ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (gain >= 1) source.connect(dest);
    else {
      const level = ctx.createGain();
      level.gain.value = Math.max(0, gain);
      source.connect(level).connect(dest);
    }
    source.start();
  } catch {
    /* Missing audio should never interrupt the game. */
  }
}
