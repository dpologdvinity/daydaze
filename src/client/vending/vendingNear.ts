// Whether the player stands at a vending machine, shared by the scene (which
// measures it) and the overlay's panel (which shows the soda).
import { createStore } from "../rooms/shared/store.ts";

export const vendingNear = createStore({ near: false });
