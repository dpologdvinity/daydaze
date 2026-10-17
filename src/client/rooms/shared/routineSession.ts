import {
  closeOut,
  judgesScore,
  newRoutine,
  press as pressRoutine,
  type Element,
  type Routine,
} from "../../../game/gymnastics.ts";
import type { PrizeGame } from "../../../game/prizes.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "./store.ts";

/** A routine's phases: waiting to start, on the clock, judged. */
export type Phase = "off" | "routine" | "over";

/**
 * A judged routine on a clock (the gym's floor routine, the rink's ice
 * show): press as each element's ring closes; when the music ends the
 * judges' score goes to the prize desk as `game`.
 */
export function createRoutineSession(
  program: readonly Element[],
  seconds: number,
  game: PrizeGame,
) {
  const OFF = {
    phase: "off" as Phase,
    routine: newRoutine(program) as Routine,
    startAt: 0,
  };
  const store = createStore(OFF);
  const routineTime = (now: number) => {
    const s = store.get();
    return s.phase === "routine" ? (now - s.startAt) / 1000 : 0;
  };
  const start = (now: number) =>
    store.set({ ...OFF, phase: "routine", startAt: now });
  const leave = () => store.set(OFF);
  const press = (now: number) => {
    const s = store.get();
    if (s.phase === "over") return start(now);
    if (s.phase !== "routine") return;
    const routine = pressRoutine(s.routine, routineTime(now), program);
    if (routine !== s.routine) store.set({ routine });
  };
  const tick = (now: number) => {
    const s = store.get();
    if (s.phase !== "routine") return;
    const t = routineTime(now);
    const routine = closeOut(s.routine, t, program);
    if (t >= seconds) {
      award(game, judgesScore(routine, program));
      store.set({ routine, phase: "over" });
    } else if (routine.marks.some((m, i) => m !== s.routine.marks[i]))
      store.set({ routine });
  };
  return { store, program, routineTime, start, leave, press, tick };
}

export type RoutineSession = ReturnType<typeof createRoutineSession>;
