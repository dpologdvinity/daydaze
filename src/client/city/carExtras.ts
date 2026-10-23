import type { TrackId } from "../../audio/proceduralJukebox.ts";
import { createStore } from "../rooms/shared/store.ts";

/** The station on in your car (RoomAudio plays it while you drive) and
 * whether the headlights are on. Both reset when you get out. */
export const carExtras = createStore({
  station: null as TrackId | null,
  lights: false,
});
