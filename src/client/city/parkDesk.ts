// What the park's two new places tell the overlay: the market stall in reach,
// and whether the player's pet can be let off the leash in the dog yard. The
// 3D scene (FarmersMarket, DogPark, PetFollower) writes it; ParkPanel reads it.
// `parkWorld` is the dog yard's shared simulation, so your own pet romps
// among the resident dogs (src/game/city/dogPark.ts).

import { newWorld } from "../../game/city/dogPark.ts";
import { createStore } from "../rooms/shared/store.ts";

export const parkDesk = createStore({
  /** Id of the open market stall within reach, or null. */
  stall: null as string | null,
  /** Your pet's name when it is with you, else null. */
  petName: null as string | null,
  /** Whether you are inside the dog yard. */
  inYard: false,
  /** Whether your pet is off the leash (it romps while you stand in the yard). */
  offLeash: false,
});

export const parkWorld = newWorld();
