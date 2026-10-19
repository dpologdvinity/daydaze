// What a player is doing, in the 24 characters a move message's `action`
// carries: their mood; for a dance, the move, so everyone sees the same
// dance; on a seat, whether they sit or lie and the height they're at
// ("sit@38", in centimeters), since moves carry only x and z. A move id too
// long to fit goes as a plain "dance".
import { isDanceMoveId, type DanceMoveId } from "./dance/moves.ts";
import { MOODS, type Mood } from "./look.ts";

const LIMIT = 24;
const isMood = (a: string): a is Mood => MOODS.some((m) => m.id === a);

export type Doing = {
  mood: Mood;
  dance?: DanceMoveId;
  /** On a seat: lying back rather than sitting, at this height (m). */
  seat?: { lie: boolean; y: number };
};

export function encodeAction(
  mood: Mood,
  dance: DanceMoveId,
  seat?: { lie: boolean; y: number },
): string {
  if (seat) {
    const cm = Math.max(-200, Math.min(2000, Math.round(seat.y * 100)));
    return `${seat.lie ? "lay" : "sit"}@${cm}`;
  }
  const full = `dance:${dance}`;
  return mood === "dance" && full.length <= LIMIT ? full : mood;
}

/** A received action: an unknown mood is idle, an unknown move no move. */
export function decodeAction(action: string): Doing {
  const seated = /^(sit|lay)@(-?\d{1,4})$/.exec(action);
  if (seated)
    return {
      mood: "sit",
      seat: { lie: seated[1] === "lay", y: Number(seated[2]) / 100 },
    };
  if (action.startsWith("dance:")) {
    const move = action.slice(6);
    return isDanceMoveId(move)
      ? { mood: "dance", dance: move }
      : { mood: "dance" };
  }
  return { mood: isMood(action) ? action : "idle" };
}
