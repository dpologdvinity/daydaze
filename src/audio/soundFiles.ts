// Lazy file playback through the shared SFX bus; no requests before unlock.
import { getSharedAudioBus } from "./audioBus.ts";
import { AMBIENCE_IDS, isMusicBed, type AmbienceId } from "./ambience.ts";

const buffers = new Map<string, Promise<AudioBuffer>>();
/** Buffers already decoded, for sounds that must start this instant (steps). */
const decoded = new Map<string, AudioBuffer>();
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
    promise = decode(`${base}.ogg`, ctx)
      .catch(() => decode(`${base}.mp3`, ctx))
      .then((buffer) => {
        decoded.set(id, buffer);
        return buffer;
      });
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
  if (ctx && ctx.state !== "running") {
    // not playing: still stop what the new levels no longer want
    for (const [id, node] of active) {
      if (levels[id]) continue;
      active.delete(id);
      try {
        node.source.stop(0);
      } catch {
        /* already stopped */
      }
    }
  }
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

/** One-shot files (public/audio/<id>.ogg), played once per call. */
export type OneShotId =
  | "door"
  | "horn"
  | "coin"
  | "camera"
  | "elephant"
  | "lion"
  | "flamingos"
  | "zebra"
  | "penguin"
  | "cow"
  | "donkey"
  | "splash"
  | "bus-door"
  | "bus-brake"
  | "step-pavement"
  | "step-wood"
  | "step-sand";

/**
 * Plays a one-shot only if it has already been decoded, else starts loading it
 * and returns false so the caller can use its synthesized version meanwhile.
 * `rate` varies the pitch (footsteps never sound the same twice).
 */
export function playCachedSound(id: OneShotId, gain = 1, rate = 1): boolean {
  const bus = getSharedAudioBus();
  const ctx = bus.getContext();
  const dest = bus.getSfxDestination();
  if (!ctx || !dest || ctx.state !== "running") return false;
  const buffer = decoded.get(id);
  if (!buffer) {
    if (!failed.has(id)) void load(id, ctx).catch(() => undefined);
    return false;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const level = ctx.createGain();
  level.gain.value = Math.max(0, Math.min(1, gain));
  source.connect(level).connect(dest);
  source.start();
  return true;
}

/** A footstep recording for `ground`; false until it is loaded (or for grass
 * and floors, which keep the synthesized step). */
export function playStepFile(ground: string): boolean {
  if (ground !== "pavement" && ground !== "wood" && ground !== "sand")
    return false;
  return playCachedSound(`step-${ground}`, 0.7, 0.92 + Math.random() * 0.16);
}

/** Looped vehicle files, started and shaped by setLoop. */
export type LoopId = "car-engine" | "tire-hum" | "bus-engine";
const loops = new Map<
  LoopId,
  { source: AudioBufferSourceNode; gain: GainNode }
>();
const starting = new Set<LoopId>();
/** The latest level and rate asked for, which a loop still loading starts with. */
const wanted = new Map<LoopId, { level: number; rate: number }>();

/**
 * Sets a vehicle loop's `level` (0..1) and playback `rate`; level 0 fades it
 * out and stops it. The file loads on the first non-zero level.
 */
export function setLoop(id: LoopId, level: number, rate = 1): void {
  wanted.set(id, { level, rate });
  const bus = getSharedAudioBus();
  const ctx = bus.getContext();
  const dest = bus.getSfxDestination();
  const node = loops.get(id);
  // stopping never waits on the context: a loop left running while it is
  // suspended would sound again the moment it resumes
  if (level <= 0 && node) {
    loops.delete(id);
    try {
      node.source.stop(
        ctx && ctx.state === "running" ? ctx.currentTime + 0.5 : 0,
      );
    } catch {
      /* already stopped */
    }
    return;
  }
  if (!ctx || !dest || ctx.state !== "running") return;
  if (node) {
    node.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.15);
    node.source.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.15);
    return;
  }
  if (level <= 0 || starting.has(id)) return;
  starting.add(id);
  void load(id, ctx)
    .then((buffer) => {
      const want = wanted.get(id);
      if (loops.has(id) || !want || want.level <= 0) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = want.rate;
      gain.gain.value = want.level;
      source.connect(gain).connect(dest);
      source.start();
      loops.set(id, { source, gain });
    })
    .catch(() => undefined)
    .finally(() => starting.delete(id));
}

/** One-shot files; `gain` (0..1) turns a far-off sound down. */
export async function playSoundFile(id: OneShotId, gain = 1): Promise<void> {
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

/** Starts fetching and decoding one-shots ahead of their first use. */
export function preloadSounds(ids: readonly OneShotId[]): void {
  const ctx = getSharedAudioBus().getContext();
  if (!ctx || ctx.state !== "running") return;
  for (const id of ids)
    if (!failed.has(id)) void load(id, ctx).catch(() => undefined);
}
