// Flip City's floor routine session: the shared routine session built over the
// gymnastics program, and its store and actions re-exported under the names the
// gym's panel and scene import.

import { ROUTINE, ROUTINE_SECONDS } from "../../../game/gymnastics.ts";
import { createRoutineSession } from "../shared/routineSession.ts";

export type { Phase } from "../shared/routineSession.ts";

/** A floor routine: press as each element's ring closes. */
export const floor = createRoutineSession(
  ROUTINE,
  ROUTINE_SECONDS,
  "gymnastics",
);
/**
 * The floor session's store (as `gym`) and its clock and actions, destructured
 * for direct import.
 */
export const { store: gym, routineTime, start, leave, press, tick } = floor;
