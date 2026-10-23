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
  "runway",
  "laser-tag",
  "paintball",
  "barista",
  "macaron-tower",
  "surf",
  "skee-ball",
  "wine-pour",
  "nails",
  "boba",
  "halo-halo",
  "ramen",
  "sushi",
  "safari",
  "curling",
  "feeding",
  "reef",
  "speedway",
  "jet-ski",
  "bumper-cars",
  "midway-whack",
  "midway-gallery",
  "midway-squirt",
  "midway-rings",
  "gem-glam",
  "star-siege",
  "trivia",
  "cook-off",
  "volleyball",
  "range-pistol",
  "range-rifle",
  "cliff-dive",
  "speed-slide",
] as const;
export type PrizeGame = (typeof PRIZE_GAMES)[number];

type Table = {
  label: string;
  /** Where it's played. */
  room: RoomId;
  /** The least score for S, A and B; anything less is a C. */
  grades: readonly [number, number, number];
  /** Mini golf counts strokes against par, races count places: lower is better. */
  lower?: true;
  /** How a score reads on the prize card. */
  format: (score: number) => string;
};

const plain = (unit: string) => (score: number) => `${score} ${unit}`;

const ORDINAL = ["1st", "2nd", "3rd"];
const placed = (place: number) => `${ORDINAL[place - 1] ?? `${place}th`} place`;

export const PRIZE_TABLES: Record<PrizeGame, Table> = {
  speedway: {
    label: "Speedway race",
    room: "speedway",
    grades: [1, 2, 3],
    lower: true,
    format: placed,
  },
  "jet-ski": {
    label: "Harbor Run",
    room: "marina",
    grades: [1, 2, 3],
    lower: true,
    format: placed,
  },
  "bumper-cars": {
    label: "Bumper cars",
    room: "speedway",
    grades: [12, 7, 3],
    format: plain("bumps"),
  },
  // The arcade cabinets have difficulty levels; prizes grade on the medium bars.
  "midway-whack": {
    label: "Whack-a-mole",
    room: "amusement-park",
    grades: [300, 220, 130],
    format: plain("points"),
  },
  "midway-gallery": {
    label: "Shooting gallery",
    room: "amusement-park",
    grades: [200, 140, 75],
    format: plain("points"),
  },
  "midway-squirt": {
    label: "Water-gun race",
    room: "amusement-park",
    grades: [140, 90, 55],
    format: plain("points"),
  },
  "midway-rings": {
    label: "Ring toss",
    room: "amusement-park",
    grades: [130, 80, 40],
    format: plain("points"),
  },
  "gem-glam": {
    label: "Gem Glam",
    room: "arcade-bar",
    grades: [3300, 2200, 1320],
    format: plain("points"),
  },
  "star-siege": {
    label: "Star Siege",
    room: "arcade-bar",
    grades: [1500, 900, 400],
    format: plain("points"),
  },
  // the light-gun range at Photon Zone: the Midway gallery's medium and
  // hard bars
  "range-pistol": {
    label: "Pistol drill",
    room: "laser-tag",
    grades: [200, 140, 75],
    format: plain("points"),
  },
  "range-rifle": {
    label: "Rifle drill",
    room: "laser-tag",
    grades: [180, 120, 60],
    format: plain("points"),
  },
  "speed-slide": {
    label: "Speed slide",
    room: "water-park",
    grades: [95, 102, 110],
    lower: true,
    format: (s) => `${(s / 10).toFixed(1)} s`,
  },
  "cliff-dive": {
    label: "Cliff dive",
    room: "water-park",
    grades: [80, 55, 30],
    format: plain("points"),
  },
  volleyball: {
    label: "Beach volleyball",
    room: "city",
    grades: [7, 5, 3],
    format: (s) => `${s} points to 7`,
  },
  "cook-off": {
    label: "Cook-off",
    room: "kamayan-hall",
    grades: [100, 75, 50],
    format: plain("points"),
  },
  trivia: {
    label: "Trivia",
    room: "arcade-bar",
    grades: [9, 7, 5],
    format: (s) => `${s} right`,
  },
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
  runway: {
    label: "Runway Walk",
    room: "catwalk",
    grades: [11, 10, 9],
    format: (s) => s.toFixed(3),
  },
  "laser-tag": {
    label: "Laser tag",
    room: "laser-tag",
    grades: [900, 600, 300],
    format: plain("points"),
  },
  paintball: {
    label: "Paintball",
    room: "paintball",
    grades: [1000, 650, 300],
    format: plain("points"),
  },
  reef: {
    label: "Reef Spotter",
    room: "aquarium",
    grades: [80, 56, 36],
    format: plain("points"),
  },
  feeding: {
    label: "Feeding time",
    room: "zoo",
    grades: [100, 75, 50],
    format: plain("points"),
  },
  curling: {
    label: "Curling",
    room: "ice-rink",
    grades: [16, 10, 5],
    format: plain("points"),
  },
  safari: {
    label: "Safari photo hunt",
    room: "zoo",
    grades: [220, 160, 100],
    format: plain("points"),
  },
  sushi: {
    label: "Sushi Catch",
    room: "sushi-bar",
    grades: [300, 200, 100],
    format: plain("points"),
  },
  ramen: {
    label: "Ramen Rush",
    room: "ramen-shop",
    grades: [100, 75, 50],
    format: plain("points"),
  },
  "halo-halo": {
    label: "Halo-halo counter",
    room: "halo-halo-cafe",
    grades: [100, 75, 50],
    format: plain("points"),
  },
  boba: {
    label: "Boba bar",
    room: "boba-matcha",
    grades: [100, 75, 50],
    format: plain("points"),
  },
  nails: {
    label: "Nail station",
    room: "salon",
    grades: [550, 420, 300],
    format: plain("points"),
  },
  "wine-pour": {
    label: "Pour a flight",
    room: "wine-bar",
    grades: [440, 340, 220],
    format: plain("points"),
  },
  "skee-ball": {
    label: "Skee-Ball",
    room: "boardwalk-arcade",
    grades: [300, 200, 120],
    format: plain("points"),
  },
  surf: {
    label: "Surfing",
    room: "surf-shack",
    grades: [320, 220, 120],
    format: plain("points"),
  },
  "macaron-tower": {
    label: "Macaron tower",
    room: "patisserie",
    grades: [150, 90, 50],
    format: plain("points"),
  },
  barista: {
    label: "Barista shift",
    room: "espresso-lab",
    grades: [100, 75, 50],
    format: plain("points"),
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
