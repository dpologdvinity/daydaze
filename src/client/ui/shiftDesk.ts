// Where a finished paid shift (game/shifts.ts) hands in its result. The app
// pays it into the save and posts the slip, which the order panel shows.
import type { Job, ShiftResult } from "../../game/shifts.ts";
import { createStore } from "../rooms/shared/store.ts";

export type PaySlip = {
  /** The job that earned it: a panel shows only its own station's slip. */
  job: Job;
  coins: number;
  xp: number;
  clean: boolean;
  slow: boolean;
  /** "Kitchen · Sous chef" when this shift earned a promotion, else null. */
  promotion: string | null;
  /** The promotion's bonus coins, already inside `coins`. */
  bonus: number;
};

export const shiftDesk = createStore<{
  pending: { job: Job; result: ShiftResult } | null;
  /** The last shift's pay; null until one is paid, and while a shift runs. */
  slip: PaySlip | null;
}>({ pending: null, slip: null });

/** Hands a finished shift in for pay. */
export function clockOut(job: Job, result: ShiftResult) {
  shiftDesk.set({ pending: { job, result } });
}
