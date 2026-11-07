// Chores for the player's doll: planting, watering and harvesting in the
// garden and on the farm play Quaternius' farm clips (the "ual" pack, CC0)
// for a few seconds after the action, through the same game-clip channel the
// sports use (gameClip.ts). The panels call `doWork`; the room scene calls
// `useWorkClip` once.

import type { GameClipId } from "../../../../game/dance/moves.ts";
import { createStore } from "../store.ts";
import { useGameClip } from "./gameClip.ts";

/** The chore clips. */
export type WorkClipId = Extract<
  GameClipId,
  "farm-plant" | "farm-water" | "farm-harvest"
>;

/** How long a chore's clip plays, seconds. */
export const WORK_SECONDS = 2.6;

const work = createStore({ move: null as WorkClipId | null });

/** Starts a chore clip on the player's doll; it hands the doll back after
 * WORK_SECONDS unless another chore has started since. */
export function doWork(move: WorkClipId): void {
  work.set({ move });
  setTimeout(() => {
    if (work.get().move === move) work.set({ move: null });
  }, WORK_SECONDS * 1000);
}

/** Plays whatever chore `doWork` last started, as game clip `by`. */
export function useWorkClip(by: string): void {
  const { move } = work.use();
  useGameClip(by, move);
}
