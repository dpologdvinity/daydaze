// Whether the player's own doll is out of her depth: the sea rooms' player
// controller sets it each frame, and HumanDoll then plays her swim strokes
// (stroking while she moves, treading when she stops) in place of any walk.
// Also her rented scuba gear: whether she has it on (tank and mask drawn).

import { createStore } from "../../rooms/shared/store.ts";

export const afloat = { on: false };

/** The dive shack's gear: rented from its counter, worn (or not) while in
 * the sea rooms. The tank refills at every descent. */
export const scuba = createStore({ rented: false, wearing: false });
