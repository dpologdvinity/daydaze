// Cliff diving off the Water Park's tower: five dives a set. Pick a trick
// (harder ones are worth more and sweep the entry meter faster), then stop
// the meter in the middle for a clean, splashless entry. Pure: the client
// keeps the clock.

export const DIVES = 5;

export const TRICKS = [
  { id: "pencil", label: "Pencil drop", difficulty: 1 },
  { id: "swan", label: "Swan dive", difficulty: 1.4 },
  { id: "backflip", label: "Backflip", difficulty: 1.8 },
  { id: "twist", label: "Twisting flip", difficulty: 2.2 },
] as const;

export type TrickId = (typeof TRICKS)[number]["id"];
export type Entry = "rip" | "clean" | "splash" | "flop";

const trick = (id: TrickId) => TRICKS.find((t) => t.id === id) ?? TRICKS[0];

/** Points an entry is worth before the trick's difficulty. */
export const ENTRY_POINTS: Record<Entry, number> = {
  rip: 10,
  clean: 7,
  splash: 4,
  flop: 0,
};

/** How an entry stopped at `at` (0..1) goes in: 0.5 is straight down. */
export function entryOf(at: number): Entry {
  const off = Math.abs(at - 0.5);
  return off <= 0.06
    ? "rip"
    : off <= 0.15
      ? "clean"
      : off <= 0.3
        ? "splash"
        : "flop";
}

/** The entry meter, `seconds` after it starts: up and down 0..1. */
export function entryAt(id: TrickId, seconds: number): number {
  const p = (Math.max(0, seconds) * 0.6 * trick(id).difficulty) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

export type Dive = { trick: TrickId; entry: Entry; points: number };
export type Dives = readonly Dive[];

export const newDives = (): Dives => [];
export const gameOver = (g: Dives) => g.length >= DIVES;
export const total = (g: Dives) => g.reduce((s, d) => s + d.points, 0);

export function dive(g: Dives, id: TrickId, at: number): Dives {
  if (gameOver(g)) return g;
  const entry = entryOf(at);
  const points = Math.round(ENTRY_POINTS[entry] * trick(id).difficulty);
  return [...g, { trick: id, entry, points }];
}

/** Each trick's turn through the air: somersault (pitch, radians, positive
 * forward) and twist about the body's long axis. */
const TURNS: Record<TrickId, { pitch: number; twist: number }> = {
  pencil: { pitch: 0, twist: 0 },
  swan: { pitch: Math.PI, twist: 0 },
  backflip: { pitch: -2 * Math.PI, twist: 0 },
  twist: { pitch: 2 * Math.PI, twist: 2 * Math.PI },
};

/** How far off the vertical each entry finishes: a flop lands flat. */
const ENTRY_OFF: Record<Entry, number> = {
  rip: 0,
  clean: 0.12,
  splash: 0.4,
  flop: Math.PI / 2,
};

const smooth = (from: number, to: number, u: number) => {
  const x = Math.min(1, Math.max(0, (u - from) / (to - from)));
  return x * x * (3 - 2 * x);
};

/**
 * The diver's turn `u` (0 at take-off, 1 at the water) through a dive: the
 * somersault and twist of the trick, eased so it opens and closes, with the
 * entry's error (over- or under-rotation) creeping in at the end. A rip
 * enters dead vertical, feet or head first.
 */
export function diveTurn(
  id: TrickId,
  entry: Entry,
  u: number,
): { pitch: number; twist: number } {
  const turn = TURNS[id];
  // a swan holds its spread layout, then rolls over late; flips tuck early
  const ease = id === "swan" ? smooth(0.35, 0.95, u) : smooth(0.08, 0.85, u);
  const dir = turn.pitch < 0 ? -1 : 1;
  const off = ENTRY_OFF[entry] * smooth(0.7, 1, u);
  // `+ 0` folds -0 into 0
  return {
    pitch: turn.pitch * ease + dir * off + 0,
    twist: turn.twist * smooth(0.15, 0.8, u) + 0,
  };
}

/** How big the splash is for an entry (Splash and playSplash sizes). */
export function splashSize(entry: Entry): number {
  return { rip: 0.25, clean: 0.55, splash: 1.1, flop: 2 }[entry];
}
