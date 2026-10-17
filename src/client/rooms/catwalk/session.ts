import { PROGRAM, PROGRAM_SECONDS } from "../../../game/catwalk.ts";
import { createRoutineSession } from "../shared/routineSession.ts";

/** Runway Walk: press as each cue's ring closes. */
export const runway = createRoutineSession(PROGRAM, PROGRAM_SECONDS, "runway");
