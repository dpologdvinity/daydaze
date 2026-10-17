// Today's challenges: three of the city's games, each with a score to reach,
// the same three for everyone on a given (UTC) day. Reaching one pays a
// bonus on top of the game's prize, once a day. Pure.

import { beats, PRIZE_GAMES, PRIZE_TABLES, type PrizeGame } from "./prizes.ts";

export const CHALLENGES_PER_DAY = 3;
export const CHALLENGE_PAY = 50;

const DAY_MS = 86_400_000;

export type Challenge = { game: PrizeGame; target: number };

export type ChallengeSave = { day: number; done: PrizeGame[] };

export function dayOf(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

function rand(n: number): number {
  const v = Math.sin(n * 91.345 + 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/** The day's three games, each asking for its A-grade score. */
export function challengesFor(day: number): Challenge[] {
  const pool = [...PRIZE_GAMES];
  const out: Challenge[] = [];
  for (let i = 0; i < CHALLENGES_PER_DAY; i++) {
    const [game] = pool.splice(Math.floor(rand(day * 7 + i) * pool.length), 1);
    out.push({ game, target: PRIZE_TABLES[game].grades[1] });
  }
  return out;
}

/** Whether a score reaches a challenge's target. */
export function reaches(c: Challenge, score: number): boolean {
  return score === c.target || beats(c.game, score, c.target);
}

/** Scores a finished game against today's challenges: the save to keep and
 * the bonus it pays (0 when it completes nothing new). */
export function completeChallenge(
  save: ChallengeSave,
  day: number,
  game: PrizeGame,
  score: number,
): { save: ChallengeSave; coins: number } {
  const done = save.day === day ? save.done : [];
  const c = challengesFor(day).find((x) => x.game === game);
  if (!c || done.includes(game) || !reaches(c, score))
    return { save: { day, done }, coins: 0 };
  return { save: { day, done: [...done, game] }, coins: CHALLENGE_PAY };
}

export const NO_CHALLENGES: ChallengeSave = { day: 0, done: [] };

/** The challenge record from storage; anything malformed starts afresh. */
export function cleanChallenges(value: unknown): ChallengeSave {
  if (typeof value !== "object" || value === null) return NO_CHALLENGES;
  const day: unknown = Reflect.get(value, "day");
  const done: unknown = Reflect.get(value, "done");
  if (typeof day !== "number" || !Number.isInteger(day) || !Array.isArray(done))
    return NO_CHALLENGES;
  const games = PRIZE_GAMES.filter((g) => done.includes(g));
  return { day, done: games };
}
