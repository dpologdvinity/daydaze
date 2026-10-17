import { SHOW, SHOW_SECONDS } from "../../../game/sealShow.ts";
import { createRoutineSession } from "../shared/routineSession.ts";

/** The seal show: cue each of Pepper's tricks as its ring closes. */
export const sealShow = createRoutineSession(SHOW, SHOW_SECONDS, "seal-show");
