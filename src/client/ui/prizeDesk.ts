// Where finished games hand in their score. The app grades it against the
// saved best and pays out, and the prize card and confetti read the result.
import type { Bests, Prize, PrizeGame } from "../../game/prizes.ts";
import { createStore } from "../rooms/shared/store.ts";

const NO_BESTS: Bests = {};

/**
 * Finished games hand their score in here; the app grades it against the
 * saved best, pays out and posts the prize, which the card and the confetti
 * show.
 */
export const prizeDesk = createStore<{
  pending: { game: PrizeGame; score: number } | null;
  shown: Prize | null;
  challenge: number;
  xp: number;
  note: string;
  bests: Bests;
  at: number;
}>({
  pending: null,
  shown: null,
  /** Coins a daily challenge paid on top, 0 when none was reached. */
  challenge: 0,
  /** XP the finished game added to its ladder. */
  xp: 0,
  /** What the server did with the score (the daily XP left, or why it
   * didn't count); empty for a guest or before it answers. */
  note: "",
  /** The saved personal bests, mirrored here for the scoreboards. */
  bests: NO_BESTS,
  /** performance.now() when `shown` was posted. */
  at: 0,
});

export function award(game: PrizeGame, score: number) {
  prizeDesk.set({ pending: { game, score } });
}

export function postPrize(prize: Prize, challenge: number, xp = 0) {
  prizeDesk.set({
    pending: null,
    shown: prize,
    challenge,
    xp,
    note: "",
    at: performance.now(),
  });
}

export function dismissPrize() {
  prizeDesk.set({ shown: null });
}
