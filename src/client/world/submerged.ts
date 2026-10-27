// Whether the player is under the water (a dive): the room's ambience gives way
// to the muffled underwater loop (audio/ambience.ts). Set by PlayerController.
import { createStore } from "../rooms/shared/store.ts";

export const submergedView = createStore({ on: false });
