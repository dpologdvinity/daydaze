import type { TrackId } from "../audio/proceduralJukebox.ts";
import { createStore } from "./rooms/shared/store.ts";

/** A record picked to play: a sample at Vinyl Vault, or one of yours on
 * the record player at home. RoomAudio plays it in those two rooms. */
export const musicPick = createStore({ track: null as TrackId | null });
