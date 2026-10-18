import { createStore } from "../shared/store.ts";

/** Which exhibit the visitor is looking at (an index into EXHIBITS), or
 * null while she walks the hall. The panel sets it, the scene frames it. */
export const tour = createStore({ focus: null as number | null });

export function look(focus: number | null) {
  tour.set({ focus });
}
