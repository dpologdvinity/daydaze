// Throwback Trivia: ten questions dealt from the bank, four answers each in
// a shuffled order, a clock per question. Pure and deterministic: a game's
// seed fixes its questions and their order.

import type { PayGrade } from "../../game/wallet.ts";
import { QUESTIONS } from "./questions.ts";

export const ROUND = 10;
/** Seconds to answer each question. */
export const SECONDS = 15;

export type Card = {
  q: string;
  answers: readonly string[];
  /** Index into `answers` of the right one. */
  right: number;
};

export type Game = {
  cards: readonly Card[];
  /** Questions answered so far: your pick (-1 when the clock ran out). */
  picks: readonly number[];
};

function rand(seed: number, n: number): number {
  const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(seed, i) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newGame(seed: number): Game {
  const cards = shuffled(QUESTIONS, seed)
    .slice(0, ROUND)
    .map((question, k): Card => {
      const order = shuffled([0, 1, 2, 3], seed * 31 + k);
      return {
        q: question.q,
        answers: order.map((i) => question.answers[i]),
        right: order.indexOf(0),
      };
    });
  return { cards, picks: [] };
}

export function current(g: Game): Card | null {
  return g.cards[g.picks.length] ?? null;
}

/** Answers the current question with `pick` (or -1: out of time). */
export function answer(g: Game, pick: number): Game {
  return current(g) ? { ...g, picks: [...g.picks, pick] } : g;
}

export function over(g: Game): boolean {
  return g.picks.length >= g.cards.length;
}

export function correct(g: Game): number {
  return g.picks.filter((p, i) => p === g.cards[i].right).length;
}

export function grade(right: number): PayGrade {
  return right >= 9 ? "S" : right >= 7 ? "A" : right >= 5 ? "B" : "C";
}
