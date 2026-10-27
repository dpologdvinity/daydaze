// The bridge between the Zoo's adoption panel and the saved pet: App mirrors
// the saved pet in here and installs `act`, which applies a change to the
// save (the panel never touches the save itself).
import type { PetSave } from "../../../game/pet.ts";
import { createStore } from "../shared/store.ts";

export const petDesk = createStore({
  pet: null as PetSave | null,
  act: null as
    ((change: (pet: PetSave | null) => PetSave | null) => void) | null,
});
