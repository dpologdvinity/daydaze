// The haunted escape's rooms and scares: each depth of a run is a different
// room set (the client dresses the front hall as it), and each wrong door
// plays one of the house's scares in the room, with its line. Jumps and
// creaks, never gore. Pure and seeded.

/** The house's room sets, in no order. */
export const ROOM_SETS = [
  "parlor",
  "nursery",
  "library",
  "dining",
  "bedroom",
  "attic",
  "chapel",
  "conservatory",
] as const;
export type RoomSet = (typeof ROOM_SETS)[number];

/** What a scare does in the room. */
export type ScareKind =
  | "doll-head"
  | "candles-out"
  | "sheet-slide"
  | "rocking-chair"
  | "portrait-eyes"
  | "music-box";

/** Each scare with the line that names it. */
export const SCARES: readonly { kind: ScareKind; line: string }[] = [
  {
    kind: "doll-head",
    line: "A porcelain doll turns its head to watch you go.",
  },
  { kind: "candles-out", line: "Every candle in the room goes out at once." },
  {
    kind: "sheet-slide",
    line: "A sheet slides off a chair. Nobody's sitting there. Nobody you can see.",
  },
  {
    kind: "rocking-chair",
    line: "A rocking chair keeps rocking long after you look away.",
  },
  {
    kind: "portrait-eyes",
    line: "The portrait's eyes were looking the other way a second ago.",
  },
  {
    kind: "music-box",
    line: "A music box starts playing, then stops mid-note.",
  },
];

const FALLBACK = {
  kind: "candles-out",
  line: "Every candle in the room goes out at once.",
} as const;

const hash = (a: number, b: number) =>
  Math.imul((a ^ Math.imul(b + 1, 0x9e3779b1)) >>> 0, 0x85ebca6b) >>> 0;

/** The set room `depth` of a run is dressed as; never the last one again. */
export function roomSet(seed: number, depth: number): RoomSet {
  const pick = (d: number) => hash(seed, d * 31 + 7) % ROOM_SETS.length;
  let i = pick(depth);
  // step past the previous depth's set, so neighbors always differ
  if (depth > 0 && i === indexAt(seed, depth - 1))
    i = (i + 1) % ROOM_SETS.length;
  return ROOM_SETS[i] ?? "parlor";
}

function indexAt(seed: number, depth: number): number {
  return ROOM_SETS.indexOf(roomSet(seed, depth));
}

/** The scare behind a wrong door at `depth` with `nerve` left. */
export function scareFor(
  seed: number,
  depth: number,
  nerve: number,
): { kind: ScareKind; line: string } {
  return SCARES[hash(seed, depth * 5 + nerve) % SCARES.length] ?? FALLBACK;
}
