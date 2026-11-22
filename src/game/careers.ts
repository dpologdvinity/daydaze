// Careers: ranks on top of the short shifts (shifts.ts, #261). A career groups
// the shift jobs that count toward it and has five ranks, reached by lifetime
// shifts. Rank is derived from `save.shifts.worked`, never stored, so old
// saves already have one. Each rank pays a raise; the shift that reaches a new
// rank pays a one-time bonus. Nothing is locked, ranks only pay more. Pure.
import { JOBS, type Job, type ShiftsSave } from "./shifts.ts";

export const CAREERS = ["chef", "cafe", "zoo"] as const;
export type CareerId = (typeof CAREERS)[number];

export type CareerDef = {
  label: string;
  /** Where the shifts are, for the menu hint. */
  where: string;
  /** Shift jobs that count toward this career. */
  jobs: readonly Job[];
  /** One name per rank, lowest first; same length as RANK_SHIFTS. */
  ranks: readonly string[];
};

export const CAREER_DEFS: Record<CareerId, CareerDef> = {
  chef: {
    label: "Kitchen",
    where: "Work the ramen and halo-halo counters.",
    jobs: ["ramen", "halo-halo"],
    ranks: ["Dishwasher", "Prep cook", "Line cook", "Sous chef", "Head chef"],
  },
  cafe: {
    label: "Cafe",
    where: "Work the coffee and boba counters.",
    jobs: ["barista", "boba"],
    ranks: ["Trainee", "Counter hand", "Barista", "Shift lead", "Cafe manager"],
  },
  zoo: {
    label: "Zoo keeper",
    where: "Work feeding time at the zoo.",
    jobs: ["feeding"],
    ranks: ["Volunteer", "Feeder", "Keeper", "Senior keeper", "Head keeper"],
  },
};

/** Lifetime shifts needed for each rank (index = rank). */
export const RANK_SHIFTS = [0, 3, 8, 16, 30] as const;
/** Extra wage per rank, as a fraction of the shift's wage. */
export const RAISE_PER_RANK = 0.1;
/** Coins for reaching a rank, times the rank number. */
export const PROMOTION_BONUS = 50;

type Worked = ShiftsSave["worked"];

/** The career a job's shifts count toward. */
export function careerOf(job: Job): CareerId {
  const id = CAREERS.find((c) => CAREER_DEFS[c].jobs.some((j) => j === job));
  if (id === undefined) throw new Error(`job ${job} has no career`);
  return id;
}

/** Lifetime shifts across the career's jobs. */
export function careerShifts(worked: Worked, career: CareerId): number {
  return CAREER_DEFS[career].jobs.reduce((n, j) => n + (worked[j] ?? 0), 0);
}

/** Rank index (0 = first rank) for the shifts worked. */
export function careerRank(worked: Worked, career: CareerId): number {
  const n = careerShifts(worked, career);
  return RANK_SHIFTS.filter((need) => n >= need).length - 1;
}

/** A wage with the rank's raise added, rounded down. */
export function raised(coins: number, rank: number): number {
  return coins + Math.floor(coins * rank * RAISE_PER_RANK);
}

export type Promotion = {
  career: CareerId;
  rank: number;
  name: string;
  bonus: number;
};

/** The promotion the shift at `job` earned, or null. `before` and `after` are
 * the worked counts around that one shift. */
export function promotionFor(
  before: Worked,
  after: Worked,
  job: Job,
): Promotion | null {
  const career = careerOf(job);
  const rank = careerRank(after, career);
  if (rank <= careerRank(before, career)) return null;
  return {
    career,
    rank,
    name: CAREER_DEFS[career].ranks[rank],
    bonus: PROMOTION_BONUS * rank,
  };
}

// every job must have a career: fail at load, not mid-shift
JOBS.forEach(careerOf);
