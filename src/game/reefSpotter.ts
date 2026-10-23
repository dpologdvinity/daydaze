// Reef Spotter at the Daydaze Aquarium: fish swim past the reef window one
// at a time, quicker each round; then the guide asks how many of one kind
// went by. Five rounds; a right count scores, closer misses score a little.
// Pure and seeded: the client shows each fish for its moment.

export const FISH = [
  { id: "clownfish", label: "Tropical fish", emoji: "🐠" },
  { id: "puffer", label: "Pufferfish", emoji: "🐡" },
  { id: "octopus", label: "Octopus", emoji: "🐙" },
  { id: "turtle", label: "Sea turtle", emoji: "🐢" },
  { id: "shark", label: "Reef shark", emoji: "🦈" },
  { id: "crab", label: "Crab", emoji: "🦀" },
] as const;
export type Fish = (typeof FISH)[number]["id"];

export const ROUNDS = 5;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Round = {
  /** The fish that swim past, in order. */
  parade: readonly Fish[];
  /** Seconds each one is in the window. */
  each: number;
  /** The kind the guide asks about, and how many went by. */
  ask: Fish;
  count: number;
};

/** Round `r` (0-based) of a dive: longer parades, quicker fish. */
export function roundOf(seed: number, r: number): Round {
  const random = rng(seed * 31 + r * 7919 + 1);
  const length = 8 + r * 3;
  const kinds = FISH.slice(0, 3 + Math.min(3, r));
  const parade = Array.from(
    { length },
    () => kinds[Math.floor(random() * kinds.length)]?.id ?? "clownfish",
  );
  const ask = parade[Math.floor(random() * parade.length)] ?? "clownfish";
  return {
    parade,
    each: Math.max(0.45, 1.1 - r * 0.15),
    ask,
    count: parade.filter((f) => f === ask).length,
  };
}

/** Points for an answer: 20 when right, 8 when off by one, else none. */
export function scoreAnswer(round: Round, answer: number): number {
  const off = Math.abs(answer - round.count);
  return off === 0 ? 20 : off === 1 ? 8 : 0;
}

/** The fish in the window `t` seconds into the parade, or null after. */
export function fishAt(round: Round, t: number): Fish | null {
  if (t < 0) return null;
  return round.parade[Math.floor(t / round.each)] ?? null;
}

export const paradeSeconds = (round: Round) => round.parade.length * round.each;
