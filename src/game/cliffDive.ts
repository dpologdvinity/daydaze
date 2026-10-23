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
