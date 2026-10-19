// The Blowout Bar's nail station: a client shows you the set she wants,
// five nails, each a color and a finish. Pick a polish and a finish, tap a
// nail to paint it, and hand her the set when it's done. Every nail that
// matches scores; a quick set earns a tip. Five clients a session. Pure.

export const POLISHES = [
  { id: "#ff2f9a", label: "Hot pink" },
  { id: "#e63946", label: "Cherry" },
  { id: "#141018", label: "Black" },
  { id: "#f8f4ee", label: "Milk" },
  { id: "#9b5cff", label: "Lilac" },
  { id: "#3fe0d0", label: "Aqua" },
  { id: "#ffd84f", label: "Butter" },
  { id: "#c9a227", label: "Gold" },
] as const;
export const FINISHES = ["cream", "chrome", "glitter", "french"] as const;
export type Finish = (typeof FINISHES)[number];
export type Nail = { polish: string; finish: Finish };

export const CLIENTS = 5;
const NAIL_POINTS = 20;
const MAX_TIP = 25;
/** Seconds a set may take before the tip runs out. */
const TIP_TIME = 40;

/** The set client `n` of a session asks for: one or two polishes, an accent
 * nail now and then, a single finish or a mix. Seeded. */
export function wantedSet(seed: number, n: number): Nail[] {
  let a = (seed ^ (n * 0x9e3779b1)) >>> 0;
  const next = () => {
    a = (Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0;
    return a / 4294967296;
  };
  const pick = <T>(xs: readonly T[]): T => {
    const x = xs[Math.floor(next() * xs.length)];
    if (x === undefined) throw new Error("empty");
    return x;
  };
  const base = pick(POLISHES).id;
  const finish = pick(FINISHES);
  const accent = next() < 0.6 ? pick(POLISHES).id : base;
  const accentFinish = next() < 0.4 ? pick(FINISHES) : finish;
  // the ring finger takes the accent, as it does
  return [0, 1, 2, 3, 4].map((i) =>
    i === 3
      ? { polish: accent, finish: accentFinish }
      : { polish: base, finish },
  );
}

export type Session = {
  seed: number;
  served: number;
  points: number;
  /** The set on the client's hand right now, null nails unpainted. */
  hand: readonly (Nail | null)[];
};

export const newSession = (seed: number): Session => ({
  seed,
  served: 0,
  points: 0,
  hand: [null, null, null, null, null],
});

export const sessionOver = (s: Session) => s.served >= CLIENTS;

export function paint(s: Session, nail: number, coat: Nail): Session {
  if (sessionOver(s) || nail < 0 || nail > 4) return s;
  return { ...s, hand: s.hand.map((n, i) => (i === nail ? coat : n)) };
}

/** Hands the set over `seconds` after the client sat down. */
export function finish(
  s: Session,
  seconds: number,
): { session: Session; right: number; tip: number } {
  if (sessionOver(s)) return { session: s, right: 0, tip: 0 };
  const want = wantedSet(s.seed, s.served);
  const right = want.filter(
    (w, i) => s.hand[i]?.polish === w.polish && s.hand[i]?.finish === w.finish,
  ).length;
  const tip =
    right === 5
      ? Math.max(0, Math.round(MAX_TIP * (1 - Math.max(0, seconds) / TIP_TIME)))
      : 0;
  return {
    session: {
      ...s,
      served: s.served + 1,
      points: s.points + right * NAIL_POINTS + tip,
      hand: [null, null, null, null, null],
    },
    right,
    tip,
  };
}
