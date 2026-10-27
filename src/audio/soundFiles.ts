// Lazy file playback through the shared SFX bus; no requests before unlock.
import { getSharedAudioBus } from "./audioBus.ts";
import { AMBIENCE_IDS, isMusicBed, type AmbienceId } from "./ambience.ts";

const buffers = new Map<string, Promise<AudioBuffer>>();
/** Files that would not load or decode (no Ogg Opus in this browser, say):
 * never fetched again this session; their places keep the synthesized bed. */
const failed = new Set<string>();
const decode = async (url: string, ctx: AudioContext) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return ctx.decodeAudioData(await r.arrayBuffer());
};
async function load(id: string, ctx: AudioContext): Promise<AudioBuffer> {
  if (failed.has(id)) throw new Error(`Audio ${id} is unavailable`);
  let promise = buffers.get(id);
  if (!promise) {
    const base = `${import.meta.env.BASE_URL}audio/${id}`;
    // the MP3 twin, where one ships, for a browser that can't play the OGG
    promise = decode(`${base}.ogg`, ctx).catch(() =>
      decode(`${base}.mp3`, ctx),
    );
    buffers.set(id, promise);
    promise.catch(() => {
      buffers.delete(id);
      failed.add(id);
    });
  }
  return promise;
}
const active = new Map<
  AmbienceId,
  { source: AudioBufferSourceNode; gain: GainNode }
>();
let generation = 0;
const failedIds = (): ReadonlySet<AmbienceId> =>
  new Set(AMBIENCE_IDS.filter((id) => failed.has(id)));
/** Fades the looped files to `levels`; resolves with the ids that failed to
 * load or decode, so the caller can keep the synthesized bed for them. */
export async function setFileAmbience(
  levels: Partial<Record<AmbienceId, number>>,
): Promise<ReadonlySet<AmbienceId>> {
  const token = ++generation;
  const bus = getSharedAudioBus();
  const ctx = bus.getContext();
  const sfx = bus.getSfxDestination();
  const music = bus.getMusicDestination();
  if (!ctx || !sfx || !music || ctx.state !== "running") return failedIds();
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
    AMBIENCE_IDS.map(async (id) => {
      const level = levels[id];
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
  return failedIds();
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
