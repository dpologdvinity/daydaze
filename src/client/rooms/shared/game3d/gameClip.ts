// The game clip the player's doll plays during an in-world game (a dig, a
// dive, an aim). A game sets it while it runs; PlayerController reads it and
// lets it override the picked mood, the way a paired emote does.

import { useEffect } from "react";
import type { GameClipId } from "../../../../game/dance/moves.ts";
import { createStore } from "../store.ts";

/** The clip playing now and which game set it, or nothing. */
export const gameClip = createStore({
  move: null as GameClipId | null,
  by: null as string | null,
});

/**
 * Plays `move` on the player's doll while it is set; `null` hands the doll
 * back. Only clears a clip this game set, so two games can't fight over it.
 */
export function useGameClip(by: string, move: GameClipId | null): void {
  useEffect(() => {
    if (move) gameClip.set({ move, by });
    else if (gameClip.get().by === by) gameClip.set({ move: null, by: null });
  }, [by, move]);
  useEffect(
    () => () => {
      if (gameClip.get().by === by) gameClip.set({ move: null, by: null });
    },
    [by],
  );
}
