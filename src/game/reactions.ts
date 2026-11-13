// How the player's doll reacts to being hit or knocked: a flinch from a
// laser or paintball tag (from the side it came from), a trip or a fall on
// the sidewalk now and then, a hard landing when a skate trick bails. The
// clips are the moves pack's one-shots (art/doll/blender/mocap_clips.py);
// this file says which to play, when one may start and how rarely she trips.
// The client plays them (PlayerController, HumanDoll) and sends the id in her
// action string so everyone sees her flinch (peerAction.ts). Pure.

import { clipOf } from "./dance/clips.ts";
import { mix } from "./dance/idlePlan.ts";
import { turnBetween } from "./walker.ts";
import { yawTowards, type Vec2 } from "./walk.ts";

/** One reaction: its clip, and the one that follows it (a fall's get-up). */
export type Reaction = { clip: string; then?: ReactionId };

export type ReactionId =
  | "hit-front"
  | "hit-back"
  | "hit-left"
  | "hit-right"
  | "stumble"
  | "trip"
  | "trip-fall"
  | "get-up"
  | "hard-landing";

export const REACTIONS: Readonly<Record<ReactionId, Reaction>> = {
  "hit-front": { clip: "react-hit-front" },
  "hit-back": { clip: "react-hit-back" },
  "hit-left": { clip: "react-hit-left" },
  "hit-right": { clip: "react-hit-right" },
  stumble: { clip: "react-stumble" },
  trip: { clip: "react-trip" },
  "trip-fall": { clip: "react-trip-fall", then: "get-up" },
  "get-up": { clip: "react-get-up" },
  "hard-landing": { clip: "react-hard-landing" },
};

/** Whether `id` (from the network, say) names a reaction. */
export function isReactionId(id: unknown): id is ReactionId {
  return (
    typeof id === "string" &&
    Object.prototype.hasOwnProperty.call(REACTIONS, id)
  );
}

/** The baked clip a reaction plays. */
export const reactionClip = (id: ReactionId): string => REACTIONS[id].clip;

/** How long the reaction's own clip runs, seconds. */
export function reactionSeconds(id: ReactionId): number {
  return clipOf(REACTIONS[id].clip)?.period ?? 1;
}

/** A reaction on its way: what is playing, when it began, and when the whole
 * thing (a fall and its get-up) is over. */
export type Playing = {
  id: ReactionId;
  startAt: number;
  until: number;
  /** The reaction that follows this one's clip. */
  then?: ReactionId;
};

/**
 * Starts reaction `id` at time `now` (seconds), unless one is still playing
 * (a second hit while she flinches changes nothing) or the time is not a
 * number. Returns the new play, or null.
 */
export function startReaction(
  current: Playing | null,
  id: ReactionId,
  now: number,
): Playing | null {
  if (!Number.isFinite(now)) return null;
  if (current && now < current.until) return null;
  const { then } = REACTIONS[id];
  return {
    id,
    startAt: now,
    until: now + reactionSeconds(id) + (then ? reactionSeconds(then) : 0),
    then,
  };
}

/** Which of the play's reactions is on its clip at `now`. */
export function reactionAt(p: Playing, now: number): ReactionId {
  return p.then && now >= p.startAt + reactionSeconds(p.id) ? p.then : p.id;
}

/**
 * Which flinch a hit from `shooter` earns, given the way she faces (`yaw`,
 * radians; 0 faces +z) and where she stands. A shot from her left is a hit
 * from the left: +x is her left when she faces +z.
 */
export function hitDirection(
  yaw: number,
  me: Vec2,
  shooter: Vec2,
): "hit-front" | "hit-back" | "hit-left" | "hit-right" {
  const dx = shooter[0] - me[0];
  const dz = shooter[1] - me[1];
  if (
    !Number.isFinite(yaw) ||
    !Number.isFinite(dx + dz) ||
    (dx === 0 && dz === 0)
  )
    return "hit-front";
  const a = turnBetween(yaw, yawTowards(me, shooter));
  if (Math.abs(a) <= Math.PI / 4) return "hit-front";
  if (Math.abs(a) >= (3 * Math.PI) / 4) return "hit-back";
  return a > 0 ? "hit-left" : "hit-right";
}

// ---------------------------------------------------------------- tripping

/** She trips once in this many meters walked on a sidewalk (a few minutes). */
export const TRIP_MIN_METERS = 500;
export const TRIP_MAX_METERS = 900;
/** The share of walking trips that end in a fall (and a get-up). */
export const FALL_SHARE = 0.25;

/** The walk so far toward the next trip. */
export type Trips = { seed: number; n: number; meters: number; nextAt: number };

const nextAt = (seed: number, n: number): number =>
  TRIP_MIN_METERS +
  (mix(seed, 900 + n) % (TRIP_MAX_METERS - TRIP_MIN_METERS + 1));

export function newTrips(seed: number): Trips {
  return { seed, n: 0, meters: 0, nextAt: nextAt(seed, 0) };
}

/**
 * Adds `meters` walked and says whether she trips now. Only sidewalk meters
 * count, and only while she is `free`: not driving, skating, swimming, in a
 * game or with a menu open. Jogging, a trip is a stumble; walking, mostly a
 * trip and now and then a fall.
 */
export function stepTrips(
  s: Trips,
  step: {
    meters: number;
    onSidewalk: boolean;
    free: boolean;
    jogging: boolean;
  },
): { state: Trips; trip: ReactionId | null } {
  if (!step.onSidewalk || !step.free || !(step.meters > 0))
    return { state: s, trip: null };
  const meters = s.meters + step.meters;
  if (meters < s.nextAt) return { state: { ...s, meters }, trip: null };
  const n = s.n + 1;
  const kind: ReactionId = step.jogging
    ? "stumble"
    : (mix(s.seed, 500 + s.n) % 100) / 100 < FALL_SHARE
      ? "trip-fall"
      : "trip";
  return {
    state: { seed: s.seed, n, meters: 0, nextAt: nextAt(s.seed, n) },
    trip: kind,
  };
}
