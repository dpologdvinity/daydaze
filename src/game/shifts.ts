// Short shifts: the order-station shifts (orders.ts) as paid jobs. A finished
// shift pays a wage on top of the grade prize (prizes.ts): coins per right
// order, tips as coins, a bonus for a clean shift, plus Hustle XP. After
// FULL_PAY_SHIFTS shifts in a UTC day the rest pay half ("slow hours"), so
// grinding is capped and nothing is locked. All jobs here are non-alcohol,
// so every one is 13+. Pure; progression/activities.ts applies it to a save.
import { MAX_TIP, TICKETS } from "./orders.ts";
import type { PrizeGame } from "./prizes.ts";
import { isRecord } from "./typed.ts";

/** Workplace jobs: the order stations that are somebody's shift. */
export const JOBS = [
  "barista",
  "boba",
  "ramen",
  "halo-halo",
  "feeding",
] as const;
export type Job = (typeof JOBS)[number] & PrizeGame;

/** Coins per right order, and the bonus when every ticket was right. */
export const WAGE_PER_ORDER = 4;
export const CLEAN_BONUS = 10;
/** Hustle XP per right order. */
export const XP_PER_ORDER = 5;
/** Right orders needed for a shift to qualify as worked for career advancement. */
export const PASSING_ORDERS = Math.ceil(TICKETS / 2);
/** Shifts per day that pay in full. */
export const FULL_PAY_SHIFTS = 3;
/** Cap on a saved shift count, so a hand-edited save stays sane. */
const MAX_WORKED = 99_999;

export type ShiftsSave = {
  /** The day (challenges.ts `dayOf`) `today` counts; 0 before any shift. */
  day: number;
  /** Shifts worked on `day`. */
  today: number;
  /** Lifetime shifts per job: the rank base for careers (#261). */
  worked: Partial<Record<Job, number>>;
};

export const NO_SHIFTS: ShiftsSave = { day: 0, today: 0, worked: {} };

/** What the order session reports at the last ticket. */
export type ShiftResult = { right: number; tips: number };

export function isJob(value: unknown): value is Job {
  return JOBS.some((j) => j === value);
}

function whole(value: unknown, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= max
  );
}

/**
 * Pays one finished shift on `day`. Returns the wage (`coins`, `xp`), whether
 * every ticket was right, and the updated record. A result no station can
 * produce pays nothing and leaves the record as it was; a clock that went
 * backwards keeps the later day, so it cannot refill the day.
 */
export function settleShift(
  shifts: ShiftsSave,
  job: Job,
  result: ShiftResult,
  day: number,
): {
  coins: number;
  xp: number;
  clean: boolean;
  /** Past the daily limit: paid half. */
  slow: boolean;
  shifts: ShiftsSave;
} {
  if (!whole(result.right, TICKETS) || !whole(result.tips, TICKETS * MAX_TIP))
    return { coins: 0, xp: 0, clean: false, slow: false, shifts };
  const clean = result.right === TICKETS;
  const today = day > shifts.day ? 0 : shifts.today;
  const full = today < FULL_PAY_SHIFTS;
  const scale = (n: number) => (full ? n : Math.floor(n / 2));
  const wage =
    result.right * WAGE_PER_ORDER + result.tips + (clean ? CLEAN_BONUS : 0);
  const passed = result.right >= PASSING_ORDERS;
  return {
    coins: scale(wage),
    xp: scale(result.right * XP_PER_ORDER),
    clean,
    slow: !full,
    shifts: {
      day: Math.max(day, shifts.day),
      today: today + 1,
      worked: passed
        ? {
            ...shifts.worked,
            [job]: Math.min(MAX_WORKED, (shifts.worked[job] ?? 0) + 1),
          }
        : shifts.worked,
    },
  };
}

/** A saved record read from storage, cleaned field by field. */
export function cleanShifts(value: unknown): ShiftsSave {
  if (!isRecord(value)) return NO_SHIFTS;
  const { day, today, worked: saved } = value;
  const worked: ShiftsSave["worked"] = {};
  if (isRecord(saved))
    for (const [k, n] of Object.entries(saved))
      if (isJob(k) && whole(n, MAX_WORKED)) worked[k] = n;
  return {
    day: whole(day, Number.MAX_SAFE_INTEGER) ? day : 0,
    today: whole(today, MAX_WORKED) ? today : 0,
    worked,
  };
}
