import { PROGRAM, PROGRAM_SECONDS } from "../../../game/iceShow.ts";
import { createRoutineSession } from "../shared/routineSession.ts";

/** The ice show: press as each element's ring closes. */
export const show = createRoutineSession(PROGRAM, PROGRAM_SECONDS, "ice-show");
