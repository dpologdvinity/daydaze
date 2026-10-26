// Which baked clip a doll plays, frame by frame. The 3D doll plays Mixamo
// clips baked onto its full skeleton (art/doll/blender/mocap.py, listed in
// mocap.ts): walks, idles, dances, emotes and held poses. A few things are
// still hand-made 13-joint poses (pose.ts): the built dances and the poses
// for two, the built hip-pop pose, and everything until the clip file has
// loaded. `pickClip` says which: a clip and how to play it, or null for the
// built pose. Pure.

import type { CoupleRole } from "./couple.ts";
import { MOCAP_CLIPS } from "./mocap.ts";
import type { MocapClip } from "./mocapTypes.ts";
import { walkRate } from "./stride.ts";
import type { Mood } from "../look.ts";

const BY_ID: ReadonlyMap<string, MocapClip> = new Map(
  MOCAP_CLIPS.map((c) => [c.id, c]),
);

/** A baked clip by id, if there is one. */
export const clipOf = (id: string | undefined): MocapClip | undefined =>
  id === undefined ? undefined : BY_ID.get(id);

const idsOf = (...kinds: MocapClip["kind"][]) =>
  MOCAP_CLIPS.filter((c) => kinds.includes(c.kind)).map((c) => c.id);

/** Standing idles; the first is the player's, NPCs pick one by seed. */
export const IDLE_CLIPS: readonly string[] = idsOf("idle");

/** Where a seated doll with no held pose of her own sits. */
export const SEAT_CLIP = idsOf("seat")[0] ?? "";

/** The Lean mood: an elbow on the bar. */
export const LEAN_CLIP = "pose-lean";

/** A doll's idle loop: the player breathes, an NPC's seed picks one. */
export function idleFor(seed: number): string {
  const n = IDLE_CLIPS.length;
  return IDLE_CLIPS[((Math.floor(seed) % n) + n) % n] ?? "";
}

/** What a doll is doing this frame, as pickClip needs it. */
export type DollState = {
  /** The clip file has loaded; until then everything is the built pose. */
  loaded: boolean;
  /** Ground speed, m/s; above a crawl she walks. */
  speed: number;
  /** Her gait's walk clip (gaits.ts). */
  walk: string | undefined;
  mood: Mood;
  /** A held pose for the pose and sit moods (a clip id, or "built"). */
  hold: string | undefined;
  /** The dance mood's move. */
  dance: string;
  couple: CoupleRole | undefined;
  seed: number;
};

/** A clip to play: `rate` scales its speed; `offset` (seconds) shifts its
 * start, so a follow dances half a loop behind the lead. */
export type Play = { id: string; rate: number; offset: number };

/** Below this ground speed (m/s) a doll stands. */
export const MOVING = 0.05;

/**
 * The clip a doll plays, or null for the built 13-joint pose (pose.ts).
 * A walking doll plays her gait at a rate matched to the ground; a seated
 * one her held sit (or the seat's loop); a posing one her held pose; a
 * dancer a captured move (a follow half a loop behind, unmirrored); an idle
 * one her seed's idle. Built moves, poses for two and the built hip-pop stay
 * built.
 */
export function pickClip(s: DollState): Play | null {
  if (!s.loaded) return null;
  const play = (id: string, rate = 1, offset = 0): Play | null =>
    clipOf(id) ? { id, rate, offset } : null;
  if (s.speed > MOVING) {
    const walk = clipOf(s.walk);
    return walk?.kind === "walk"
      ? play(walk.id, walkRate(s.speed, walk.speed ?? 0))
      : null;
  }
  const hold = clipOf(s.hold);
  switch (s.mood) {
    case "sit":
      return hold && (hold.kind === "sit" || hold.kind === "lay")
        ? play(hold.id)
        : play(SEAT_CLIP);
    case "pose":
      return hold?.kind === "pose" ? play(hold.id) : null;
    case "lean":
      return play(LEAN_CLIP);
    case "dance": {
      const move = clipOf(s.dance);
      if (!move || (move.kind !== "dance" && move.kind !== "emote"))
        return null;
      return play(move.id, 1, s.couple === "follow" ? move.period / 2 : 0);
    }
    default:
      return play(idleFor(s.seed));
  }
}
