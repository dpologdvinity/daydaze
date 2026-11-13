// What a venue's dancers dance: each venue has a style (hip-hop at Pulse,
// swing at the roller disco, pop at the karaoke loft), a club night swaps in
// its own (a goth night dances Thriller), and now and then the floor is called
// to a line dance everyone does together. Each dancer's own move changes every
// minute or so. Everything is a function of the shared clock, so every player
// sees the same crowd. Pure.

import { nightsAt, type ClubNight } from "../events.ts";
import type { RoomId } from "../rooms.ts";
import type { DanceMoveId } from "./moves.ts";
import { mix } from "./idlePlan.ts";

export type DanceStyle =
  "hip-hop" | "house" | "latin" | "swing" | "pop" | "break" | "monster";

/** The moves a style's dancers pick their own from. */
export const STYLE_MOVES: Record<DanceStyle, readonly DanceMoveId[]> = {
  "hip-hop": [
    "hip-hop",
    "side-to-side",
    "body-wave",
    "arm-wave",
    "kick-step",
    "raise-the-roof",
    "running-man",
    "hip-shimmy",
    "rib-pops",
    "step-hop",
    "robot",
    "locking",
    "tut",
    "wave-hop",
  ],
  house: [
    "house",
    "house-3",
    "house-4",
    "shuffle",
    "groove",
    "body-roll",
    "two-step",
    "hip-sway",
    "y2k-shuffle",
  ],
  latin: [
    "salsa",
    "salsa-turns",
    "salsa-solo",
    "salsa-clap",
    "salsa-up-back",
    "lambada",
    "rumba",
    "samba",
    "pagode",
  ],
  swing: [
    "charleston",
    "charleston-2",
    "crazy-legs",
    "shim-sham",
    "shim-sham-2",
    "jazz-square",
    "northern-soul",
    "soul-spin",
    "the-twist",
  ],
  pop: [
    "y2k-shuffle",
    "hair-flip",
    "hip-shimmy",
    "groove",
    "twist-dance",
    "side-to-side",
    "shy-sway",
    "body-roll",
  ],
  break: [
    "bboy",
    "bboy-2",
    "uprock",
    "uprock-indian",
    "uprock-brooklyn",
    "uprock-var",
    "footwork",
    "footwork-2",
    "headspin",
  ],
  monster: ["thriller", "thriller-2", "thriller-3", "thriller-4", "snake"],
};

/** The dances the floor is called to together, per style. */
export const LINE_DANCES: Record<DanceStyle, readonly DanceMoveId[]> = {
  "hip-hop": ["running-man", "side-to-side", "raise-the-roof"],
  house: ["macarena", "ymca"],
  latin: ["salsa-clap", "macarena"],
  swing: ["shim-sham", "charleston"],
  pop: ["gangnam", "macarena", "ymca", "chicken-dance"],
  break: ["uprock", "footwork"],
  // Thriller's four parts, one after another
  monster: ["thriller", "thriller-2", "thriller-3", "thriller-4"],
};

/** A venue's style on an ordinary night; the rest dance house. */
export const VENUE_STYLE: Partial<Record<RoomId, DanceStyle>> = {
  pulse: "hip-hop",
  "sugar-rush": "pop",
  warehouse: "house",
  "la-noche": "latin",
  "velvet-room": "house",
  karaoke: "pop",
  "roller-rink": "swing",
  "arcade-bar": "pop",
};

/** The style a club night calls for, where it has one. */
export const NIGHT_STYLE: Partial<Record<ClubNight["id"], DanceStyle>> = {
  "y2k-night": "pop",
  "latin-night": "latin",
  "disco-night": "swing",
  "eighties-night": "swing",
  "goth-night": "monster",
  "rave-night": "house",
  "house-night": "house",
  "kpop-night": "pop",
  "foam-party": "house",
};

/** The style a room's floor dances at `ms` (epoch ms): the night's, else the venue's. */
export function crowdStyle(room: RoomId, ms: number): DanceStyle {
  for (const n of nightsAt(room, ms)) {
    const s = NIGHT_STYLE[n.id];
    if (s) return s;
  }
  return VENUE_STYLE[room] ?? "house";
}

/** How long one dancer keeps a move of her own. */
export const SLOT_MS = 75_000;
/** The floor is called to a line dance in the first stretch of every cycle... */
export const CALL_CYCLE_MS = 300_000;
/** ...this long, when the cycle's draw says so. */
export const CALL_MS = 100_000;
/** Cycles that call a line dance, of every ten. */
const CALL_TENTHS = 7;

const called = (cycle: number) => mix(cycle, 91) % 10 < CALL_TENTHS;

export type CrowdMove = {
  move: DanceMoveId;
  /** Part of a line dance the whole floor is doing: in step (see sync.ts). */
  line: boolean;
};

/** The move dancer `seed` is doing in `room` at `ms`. */
export function crowdMove(room: RoomId, seed: number, ms: number): CrowdMove {
  const style = crowdStyle(room, ms);
  const cycle = Math.floor(ms / CALL_CYCLE_MS);
  if (ms - cycle * CALL_CYCLE_MS < CALL_MS && called(cycle)) {
    const lines = LINE_DANCES[style];
    // Thriller goes through its parts in order; the rest are drawn
    const i = style === "monster" ? cycle : mix(cycle, 77);
    return { move: lines[i % lines.length] ?? "groove", line: true };
  }
  const moves = STYLE_MOVES[style];
  // each dancer's own slots are staggered, so the floor changes a few at a time
  const slot = Math.floor((ms + (mix(seed, 3) % SLOT_MS)) / SLOT_MS);
  return {
    move: moves[mix(seed, slot) % moves.length] ?? "groove",
    line: false,
  };
}

/** The next moment (epoch ms) a dancer's move can change after `ms`. */
export function nextChangeAt(seed: number, ms: number): number {
  const stagger = mix(seed, 3) % SLOT_MS;
  const own = (Math.floor((ms + stagger) / SLOT_MS) + 1) * SLOT_MS - stagger;
  const cycle = Math.floor(ms / CALL_CYCLE_MS);
  const callEnd = cycle * CALL_CYCLE_MS + CALL_MS;
  const call = ms < callEnd ? callEnd : (cycle + 1) * CALL_CYCLE_MS;
  return Math.min(own, call);
}

/** Skyline Supply's rare gag: in about one hour of five a shopper does the
 * shopping cart dance down an aisle. */
export function cartGagOn(ms: number): boolean {
  return mix(Math.floor(ms / 3_600_000), 5) % 5 === 0;
}
