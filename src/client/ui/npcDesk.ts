// Where recurring NPCs (game/npcMemory.ts) read what they remember and report
// a meeting. The app mirrors the save's memories and the player's name in, and
// folds each reported meeting into the save, so the record is saved with the
// player. Like shiftDesk, it keeps the 3D scene free of the save itself.
import type { NpcMemories } from "../../game/npcMemory.ts";
import { createStore } from "../rooms/shared/store.ts";

export const npcDesk = createStore<{
  /** The save's NPC memories. */
  memories: NpcMemories;
  /** The player's display name, which an NPC uses once it knows them. */
  player: string;
  /** NPC keys met and not yet folded into the save. */
  met: string[];
}>({ memories: {}, player: "", met: [] });

/** Reports that the player met the NPC with this `npcKey`. */
export function metNpc(key: string) {
  npcDesk.set({ met: [...npcDesk.get().met, key] });
}
