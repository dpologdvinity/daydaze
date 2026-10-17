import { ROUTINE, ROUTINE_SECONDS } from "../../../game/gymnastics.ts";
import { createRoutineSession } from "../shared/routineSession.ts";

export type { Phase } from "../shared/routineSession.ts";

/** A floor routine: press as each element's ring closes. */
export const floor = createRoutineSession(
  ROUTINE,
  ROUTINE_SECONDS,
  "gymnastics",
);
export const { store: gym, routineTime, start, leave, press, tick } = floor;
