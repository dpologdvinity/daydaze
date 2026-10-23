// Sushi Catch at Belt Sushi Yard: plates ride the conveyor past your seat,
// a little faster every second. Your ticket names three plates; grab each
// as it passes. A right plate is 10, a full ticket 10 more and a new ticket;
// a wrong one costs 5. A minute on the clock. Pure: the client keeps time.

export const PLATES = [
  { id: "salmon", label: "Salmon nigiri", color: "#ff8a5a" },
  { id: "tuna", label: "Tuna nigiri", color: "#d0283a" },
  { id: "tamago", label: "Tamago", color: "#ffd84f" },
  { id: "cucumber", label: "Cucumber roll", color: "#4dbf6a" },
  { id: "shrimp", label: "Shrimp nigiri", color: "#ffb0a0" },
  { id: "eel", label: "Unagi", color: "#6a3a22" },
] as const;
export type Plate = (typeof PLATES)[number]["id"];

export const ROUND_SECONDS = 60;
/** Meters between plates, the belt's length in view, and where you sit. */
export const SPACING = 0.8;
export const BELT = 8;
export const SEAT_X = 0;
/** A plate within this of your seat can be grabbed. */
export const REACH = 0.35;
/** Belt speed in m/s: it starts here and gains this much every second. */
const V0 = 0.6;
const ACCEL = 0.012;
export const TICKET_SIZE = 3;

/** How far the belt has run after `t` seconds. */
export const travel = (t: number) => V0 * t + (ACCEL * t * t) / 2;

/** Where plate `n` is at `t`: it enters at -BELT/2 and leaves at +BELT/2. */
export const plateX = (n: number, t: number) =>
  -BELT / 2 + travel(t) - n * SPACING;

function hash(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function plateKind(seed: number, n: number): Plate {
  return PLATES[hash(seed, n) % PLATES.length]?.id ?? "salmon";
}

/** Ticket `k` of a round: three plates, repeats allowed. */
export function ticketOf(seed: number, k: number): Plate[] {
  return Array.from({ length: TICKET_SIZE }, (_, i) =>
    plateKind(seed + 7919, k * TICKET_SIZE + i),
  );
}

/** The plates on the belt now: index range [first, last]. */
export function onBelt(t: number): { first: number; last: number } {
  const d = travel(t);
  return {
    first: Math.max(0, Math.ceil((d - BELT) / SPACING)),
    last: Math.max(-1, Math.floor(d / SPACING)),
  };
}

export type Round = {
  seed: number;
  /** Plates grabbed off the belt, by index. */
  taken: readonly number[];
  ticket: number;
  /** The plates of this ticket still wanted. */
  wanted: readonly Plate[];
  score: number;
  right: number;
  wrong: number;
};

export const newRound = (seed: number): Round => ({
  seed,
  taken: [],
  ticket: 0,
  wanted: ticketOf(seed, 0),
  score: 0,
  right: 0,
  wrong: 0,
});

export const roundOver = (t: number) => t >= ROUND_SECONDS;

/** The plate in reach of your seat at `t`, if any (the nearest). */
export function inReach(r: Round, t: number): number | null {
  const { first, last } = onBelt(t);
  let best: number | null = null;
  for (let n = first; n <= last; n++) {
    const off = Math.abs(plateX(n, t) - SEAT_X);
    if (off > REACH || r.taken.includes(n)) continue;
    if (best === null || off < Math.abs(plateX(best, t) - SEAT_X)) best = n;
  }
  return best;
}

export type Grab = { round: Round; got: Plate | null; right: boolean };

/** Grab what's in front of you: nothing there, nothing happens. */
export function grab(r: Round, t: number): Grab {
  if (roundOver(t)) return { round: r, got: null, right: false };
  const n = inReach(r, t);
  if (n === null) return { round: r, got: null, right: false };
  const got = plateKind(r.seed, n);
  const taken = [...r.taken, n];
  const i = r.wanted.indexOf(got);
  if (i < 0)
    return {
      round: {
        ...r,
        taken,
        score: Math.max(0, r.score - 5),
        wrong: r.wrong + 1,
      },
      got,
      right: false,
    };
  const wanted = r.wanted.filter((_, j) => j !== i);
  const done = wanted.length === 0;
  return {
    round: {
      ...r,
      taken,
      right: r.right + 1,
      score: r.score + 10 + (done ? 10 : 0),
      ticket: done ? r.ticket + 1 : r.ticket,
      wanted: done ? ticketOf(r.seed, r.ticket + 1) : wanted,
    },
    got,
    right: true,
  };
}
