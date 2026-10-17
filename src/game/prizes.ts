// Prizes for the sports and arcade games around the city: a finished game is
// graded S to C on its score, pays coins for the grade, and a personal best
// pays a bonus on top. Pure; the save keeps each game's best.

import type { RoomId } from "./rooms.ts";
import { payoutFor, type PayGrade } from "./wallet.ts";

export const PRIZE_GAMES = [
  "hoops",
  "penalties",
  "field-goals",
  "bowling",
  "mini-golf",
  "driving-range",
  "skate",
  "gymnastics",
  "dance-off",
  "fishing",
  "tennis",
  "siren-song",
  "ice-show",
  "seal-show",
] as const;
export type PrizeGame = (typeof PRIZE_GAMES)[number];

type Table = {
  label: string;
  /** Where it's played. */
  room: RoomId;
  /** The least score for S, A and B; anything less is a C. */
  grades: readonly [number, number, number];
  /** Mini golf counts strokes against par: lower is better. */
  lower?: true;
  /** How a score reads on the prize card. */
  format: (score: number) => string;
};

const plain = (unit: string) => (score: number) => `${score} ${unit}`;

export const PRIZE_TABLES: Record<PrizeGame, Table> = {
  hoops: {
    label: "Hot Shots",
    room: "dome",
    grades: [18, 12, 6],
    format: plain("points"),
  },
  penalties: {
    label: "Penalties",
    room: "stadium",
    grades: [5, 4, 3],
    format: plain("goals"),
  },
  "field-goals": {
    label: "Field goals",
    room: "gridiron",
    grades: [5, 4, 2],
    format: plain("good"),
  },
  bowling: {
    label: "Bowling",
    room: "bowling",
    grades: [180, 130, 80],
    format: plain("pins"),
  },
  "mini-golf": {
    label: "Lagoon Links",
    room: "mini-golf",
    grades: [-2, 0, 3],
    lower: true,
    format: (s) =>
      s === 0 ? "level par" : s < 0 ? `${-s} under` : `${s} over`,
  },
  "driving-range": {
    label: "Driving range",
    room: "driving-range",
    grades: [1500, 900, 400],
    format: plain("points"),
  },
  skate: {
    label: "Half-pipe",
    room: "skatepark",
    grades: [12000, 5000, 1500],
    format: plain("points"),
  },
  gymnastics: {
    label: "Floor routine",
    room: "gym",
    grades: [11, 10, 9],
    format: (s) => s.toFixed(3),
  },
  "dance-off": {
    label: "Dance-off",
    room: "pulse",
    grades: [27, 20, 10],
    format: (s) => `${s} s on the floor`,
  },
  fishing: {
    label: "Fishing",
    room: "marina",
    grades: [30, 15, 6],
    format: (s) => `${s} kg`,
  },
  tennis: {
    label: "Tennis",
    room: "courtside",
    grades: [6, 5, 3],
    format: (s) => `${s} of 7 points`,
  },
  "siren-song": {
    label: "Siren Song",
    room: "mermaid-cove",
    grades: [10, 7, 4],
    format: (s) => `${s} rounds`,
  },
  "ice-show": {
    label: "Ice show",
    room: "ice-rink",
    grades: [11, 10, 9],
    format: (s) => s.toFixed(3),
  },
  "seal-show": {
    label: "Seal show",
    room: "aquarium",
    grades: [11, 10, 9],
    format: (s) => s.toFixed(3),
  },
};

/** Coins a new personal best pays on top of the grade. */
export const BEST_BONUS = 15;

export function gradeFor(game: PrizeGame, score: number): PayGrade {
  const { grades, lower } = PRIZE_TABLES[game];
  const reaches = (bar: number) => (lower ? score <= bar : score >= bar);
  return reaches(grades[0])
    ? "S"
    : reaches(grades[1])
      ? "A"
      : reaches(grades[2])
        ? "B"
        : "C";
}

export function beats(game: PrizeGame, score: number, best?: number): boolean {
  if (best === undefined) return true;
  return PRIZE_TABLES[game].lower ? score < best : score > best;
}

export type Prize = {
  game: PrizeGame;
  score: number;
  grade: PayGrade;
  coins: number;
  /** A new personal best. */
  best: boolean;
};

export function prizeFor(game: PrizeGame, score: number, best?: number): Prize {
  const grade = gradeFor(game, score);
  const isBest = beats(game, score, best);
  return {
    game,
    score,
    grade,
    coins: payoutFor(grade) + (isBest ? BEST_BONUS : 0),
    best: isBest,
  };
}

export type Bests = Partial<Record<PrizeGame, number>>;

function isPrizeGame(value: string): value is PrizeGame {
  return PRIZE_GAMES.some((g) => g === value);
}

/** The bests from storage: unknown games and non-numbers are dropped. */
export function cleanBests(value: unknown): Bests {
  const out: Bests = {};
  if (typeof value !== "object" || value === null) return out;
  for (const [game, score] of Object.entries(value))
    if (
      isPrizeGame(game) &&
      typeof score === "number" &&
      Number.isFinite(score) &&
      Math.abs(score) < 1e7
    )
      out[game] = score;
  return out;
}
