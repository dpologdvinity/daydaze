// The reaction the player's doll is playing (a flinch from a tag, a trip, a
// hard landing; game/reactions.ts decides which and when one may start).
// Games call `react`; PlayerController plays it on her doll and holds her in
// place while it runs; OnlinePeers sends it so everyone sees it.

import {
  isReactionId,
  reactionAt,
  startReaction,
  type Playing,
  type ReactionId,
} from "../../game/reactions.ts";

/** The play under way, if any. A plain module value, read each frame. */
export const reaction: { playing: Playing | null } = { playing: null };

/** The clock reactions run on: seconds, the same everywhere in the client. */
export const reactionClock = (): number => performance.now() / 1000;

/** Starts a reaction unless one is playing; says whether it began. */
export function react(id: ReactionId, now = reactionClock()): boolean {
  const next = startReaction(reaction.playing, id, now);
  if (!next) return false;
  reaction.playing = next;
  return true;
}

/** The reaction on its clip now, or null when none is playing. */
export function reactingNow(now = reactionClock()): ReactionId | null {
  const p = reaction.playing;
  return p && now < p.until ? reactionAt(p, now) : null;
}

// ?debug=1 puts `daydazeReact("hit-left")` on the page, for screenshots and
// tests: it plays that reaction now, as a tag or a trip would
if (
  typeof window !== "undefined" &&
  new URLSearchParams(location.search).get("debug") === "1"
)
  Object.assign(window, {
    daydazeReact: (id: unknown) => isReactionId(id) && react(id),
  });
