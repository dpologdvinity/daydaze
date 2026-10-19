// What a player is doing, in the 24 characters a move message's `action`
// carries: their mood, and for a dance the move, so everyone sees the same
// dance. A move id too long to fit goes as a plain "dance".
import { isDanceMoveId, type DanceMoveId } from "./dance/moves.ts";
import { MOODS, type Mood } from "./look.ts";

const LIMIT = 24;
const isMood = (a: string): a is Mood => MOODS.some((m) => m.id === a);

export function encodeAction(mood: Mood, dance: DanceMoveId): string {
  const full = `dance:${dance}`;
  return mood === "dance" && full.length <= LIMIT ? full : mood;
}

/** A received action: an unknown mood is idle, an unknown move no move. */
export function decodeAction(action: string): {
  mood: Mood;
  dance?: DanceMoveId;
} {
  if (action.startsWith("dance:")) {
    const move = action.slice(6);
    return isDanceMoveId(move)
      ? { mood: "dance", dance: move }
      : { mood: "dance" };
  }
  return { mood: isMood(action) ? action : "idle" };
}
