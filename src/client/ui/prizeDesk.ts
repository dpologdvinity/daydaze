import type { Prize, PrizeGame } from "../../game/prizes.ts";
import { createStore } from "../rooms/shared/store.ts";

/**
 * Finished games hand their score in here; the app grades it against the
 * saved best, pays out and posts the prize, which the card and the confetti
 * show.
 */
export const prizeDesk = createStore({
  pending: null as { game: PrizeGame; score: number } | null,
  shown: null as Prize | null,
  /** performance.now() when `shown` was posted. */
  at: 0,
});

export function award(game: PrizeGame, score: number) {
  prizeDesk.set({ pending: { game, score } });
}

export function postPrize(prize: Prize) {
  prizeDesk.set({ pending: null, shown: prize, at: performance.now() });
}

export function dismissPrize() {
  prizeDesk.set({ shown: null });
}
