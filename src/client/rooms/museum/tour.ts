import { createStore } from "../shared/store.ts";

/** Which exhibit the visitor is looking at (an index into EXHIBITS), or
 * null while she walks the hall. The panel sets it, the scene frames it. */
export const tour = createStore({ focus: null as number | null });

export function look(focus: number | null) {
  console.log(
    "LOOK " +
      focus +
      " " +
      new Error().stack?.split("\n").slice(1, 4).join(" | "),
  );
  tour.set({ focus });
}
