import {
  closeOut,
  judgesScore,
  NEW_ROUTINE,
  press as pressRoutine,
  ROUTINE_SECONDS,
  type Routine,
} from "../../../game/gymnastics.ts";
import { createStore } from "../shared/store.ts";

/** A floor routine: press as each element's ring closes. */
export type Phase = "off" | "routine" | "over";

const OFF = {
  phase: "off" as Phase,
  routine: NEW_ROUTINE as Routine,
  startAt: 0,
  best: 0,
};

export const gym = createStore(OFF);

export function routineTime(now: number): number {
  const s = gym.get();
  return s.phase === "routine" ? (now - s.startAt) / 1000 : 0;
}
export function start(now: number) {
  gym.set({ ...OFF, best: gym.get().best, phase: "routine", startAt: now });
}
export function leave() {
  gym.set({ ...OFF, best: gym.get().best });
}
export function press(now: number) {
  const s = gym.get();
  if (s.phase === "over") return start(now);
  if (s.phase !== "routine") return;
  const routine = pressRoutine(s.routine, routineTime(now));
  if (routine !== s.routine) gym.set({ routine });
}
export function tick(now: number) {
  const s = gym.get();
  if (s.phase !== "routine") return;
  const t = routineTime(now);
  const routine = closeOut(s.routine, t);
  if (t >= ROUTINE_SECONDS)
    gym.set({
      routine,
      phase: "over",
      best: Math.max(s.best, judgesScore(routine)),
    });
  else if (routine.marks.some((m, i) => m !== s.routine.marks[i]))
    gym.set({ routine });
}
