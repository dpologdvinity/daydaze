// Activity-to-ladder rewards and atomic save updates. Discoveries and event
// occurrences share their saved claim with the XP, so reloads cannot repay it.
import { mayEnter } from "../age.ts";
import { completeChallenge, dayOf } from "../challenges.ts";
import { careerOf, careerRank, promotionFor, raised } from "../careers.ts";
import { visit } from "../collections.ts";
import { tagStolen } from "../crime/lift.ts";
import { schedule } from "../events.ts";
import type { MinigameId } from "../hotspots.ts";
import { prizeFor, type PrizeGame } from "../prizes.ts";
import type { RoomId } from "../rooms.ts";
import type { SaveV1 } from "../save.ts";
import { settleShift, type Job, type ShiftResult } from "../shifts.ts";
import { earn, payoutFor, type PayGrade } from "../wallet.ts";
import { addXp, type Ladder } from "./progression.ts";

/** Exhaustive: a new scored game must choose its ladder here. */
export const GAME_LADDERS: Record<PrizeGame, Ladder> = {
  hoops: "street",
  penalties: "street",
  "field-goals": "street",
  bowling: "fame",
  "mini-golf": "fame",
  "driving-range": "street",
  skate: "street",
  gymnastics: "fame",
  "dance-off": "fame",
  fishing: "hustle",
  tennis: "street",
  "siren-song": "fame",
  "ice-show": "fame",
  "seal-show": "fame",
  runway: "fame",
  "laser-tag": "street",
  paintball: "street",
  barista: "hustle",
  "macaron-tower": "hustle",
  surf: "street",
  "skee-ball": "fame",
  "wine-pour": "hustle",
  nails: "hustle",
  boba: "hustle",
  "halo-halo": "hustle",
  ramen: "hustle",
  sushi: "hustle",
  safari: "fame",
  curling: "street",
  feeding: "hustle",
  reef: "fame",
  speedway: "street",
  "jet-ski": "street",
  "bumper-cars": "street",
  "midway-whack": "fame",
  "midway-gallery": "street",
  "midway-squirt": "street",
  "midway-rings": "fame",
  "gem-glam": "fame",
  "star-siege": "street",
  trivia: "fame",
  "cook-off": "hustle",
  volleyball: "street",
  "range-pistol": "street",
  "range-rifle": "street",
  "cliff-dive": "street",
  "speed-slide": "street",
  "pool-volleyball": "street",
  "water-guns": "street",
  karaoke: "fame",
  haunted: "street",
  "reef-dive": "fame",
  pottery: "hustle",
};
const GRADE_XP: Record<PayGrade, number> = { C: 25, B: 45, A: 70, S: 100 };
const BEST_XP = 25;

/** XP a finished game pays for its grade and a personal best (the daily
 * challenge bonus is on top). Shared with the server, which grades scores itself. */
export function prizeXp(grade: PayGrade, best: boolean): number {
  return GRADE_XP[grade] + (best ? BEST_XP : 0);
}

/** The shared entry point for present and future activity completions. */
export function rewardXp(s: SaveV1, ladder: Ladder, xp: number): SaveV1 {
  const result = addXp(s.progression, ladder, xp);
  return result.progression === s.progression
    ? s
    : {
        ...s,
        progression: result.progression,
        coins: earn(s.coins, result.coins),
      };
}

export function rewardLegacy(
  s: SaveV1,
  game: MinigameId,
  grade: PayGrade,
): SaveV1 {
  return rewardXp(
    { ...s, coins: earn(s.coins, payoutFor(grade)) },
    game === "last-call" ? "hustle" : "fame",
    GRADE_XP[grade],
  );
}

/** Grades a finished game against the save: what the prize card shows.
 * Null for a score no game can produce. */
export function scorePrize(
  s: SaveV1,
  game: PrizeGame,
  score: number,
  now: number,
) {
  if (!Number.isFinite(score) || Math.abs(score) >= 1e7) return null;
  const prize = prizeFor(game, score, s.bests[game]);
  const daily = completeChallenge(s.challenges, dayOf(now), game, score);
  const xp = prizeXp(prize.grade, prize.best) + (daily.coins > 0 ? 75 : 0);
  return { prize, daily: daily.coins, challenges: daily.save, xp };
}
export type ScoredPrize = NonNullable<ReturnType<typeof scorePrize>>;

/** Commits a graded prize, so the save pays exactly what the card showed
 * even when other updates landed after grading. */
export function applyPrize(s: SaveV1, game: PrizeGame, r: ScoredPrize): SaveV1 {
  return rewardXp(
    {
      ...s,
      coins: earn(s.coins, r.prize.coins + r.daily),
      bests: r.prize.best ? { ...s.bests, [game]: r.prize.score } : s.bests,
      challenges: r.challenges,
    },
    GAME_LADDERS[game],
    r.xp,
  );
}

export function finishPrize(
  s: SaveV1,
  game: PrizeGame,
  score: number,
  now: number,
) {
  const r = scorePrize(s, game, score, now);
  return r && { ...r, save: applyPrize(s, game, r) };
}

/** A finished paid shift (shifts.ts): its wage and Hustle XP land in the save
 * together with the shift count, so a reload cannot replay it. The wage gets
 * the career rank's raise (careers.ts); the shift that earns a promotion also
 * pays its bonus, both in the returned `coins`. */
export function finishShift(
  s: SaveV1,
  job: Job,
  result: ShiftResult,
  now: number,
) {
  const w = settleShift(s.shifts, job, result, dayOf(now));
  if (w.shifts === s.shifts) return { ...w, promotion: null, save: s };
  const wage = raised(w.coins, careerRank(s.shifts.worked, careerOf(job)));
  const promotion = promotionFor(s.shifts.worked, w.shifts.worked, job);
  const coins = wage + (promotion?.bonus ?? 0);
  const paid = { ...s, coins: earn(s.coins, coins), shifts: w.shifts };
  return { ...w, coins, promotion, save: rewardXp(paid, "hustle", w.xp) };
}

export function rewardVisit(
  s: SaveV1,
  room: RoomId,
  now: number,
  adultOk: boolean,
): SaveV1 {
  if (!mayEnter(room, adultOk)) return s;
  let next = s;
  // visit() skips rooms outside the album (jail): pay only when it records one
  const visited = visit(s.visited, room);
  if (visited.length > s.visited.length)
    next = rewardXp({ ...s, visited }, "street", 30);
  if (!Number.isSafeInteger(now) || now < 0) return next;
  for (const night of schedule(now)) {
    if (!night.on || !night.clubs.includes(room)) continue;
    const end = now + night.leftMs;
    if ((next.progression.events[night.id] ?? 0) >= end) continue;
    next = rewardXp(
      {
        ...next,
        progression: {
          ...next.progression,
          events: { ...next.progression.events, [night.id]: end },
        },
      },
      "fame",
      75,
    );
  }
  return next;
}

/** A lift that got out the door: the item is yours and tagged stolen. Street
 * XP only for an item you didn't own, so re-lifting it pays nothing. */
export function rewardSteal(s: SaveV1, id: string, storeId: string): SaveV1 {
  const owned = s.wardrobe.includes(id);
  const next = {
    ...s,
    wardrobe: owned ? s.wardrobe : [...s.wardrobe, id],
    crime: tagStolen(s.crime, id, storeId),
  };
  return owned ? next : rewardXp(next, "street", 75);
}
