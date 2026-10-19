// Order stations: a shift of tickets one at a time; build each order from
// the station's ingredients and hand it over. A right order is worth 10 and
// a tip for speed; a wrong one is worth nothing. Espresso Lab's barista
// shift (barista.ts) and the boba bar (boba.ts) are both stations. Pure: the
// client keeps the clock.

export type Station = {
  ingredients: readonly { id: string; label: string }[];
  menu: readonly { name: string; recipe: readonly string[] }[];
};

export const TICKETS = 8;
/** At most this much fits in one cup. */
export const CUP_SIZE = 6;
/** Points for a right order, and the most a quick one adds in tips. */
export const ORDER_POINTS = 10;
export const MAX_TIP = 5;
/** Tip lost per second a ticket waits. */
const TIP_FALLOFF = 1 / 3;

export type Shift = {
  seed: number;
  /** Tickets handed over so far. */
  served: number;
  right: number;
  tips: number;
  /** What's in the cup now. */
  cup: readonly string[];
};

export const newShift = (seed: number): Shift => ({
  seed,
  served: 0,
  right: 0,
  tips: 0,
  cup: [],
});

/** The ticket at position `n` of a shift; one seed, one sequence. */
export function ticket(station: Station, seed: number, n: number) {
  const h = Math.imul(seed ^ (n * 0x9e3779b1), 0x85ebca6b) >>> 0;
  const order = station.menu[h % station.menu.length];
  if (!order) throw new Error("empty menu");
  return order;
}

export const shiftOver = (s: Shift) => s.served >= TICKETS;
export const score = (s: Shift) => s.right * ORDER_POINTS + s.tips;

/** Adds to the cup, if it's one of the station's and there's room. */
export function pour(station: Station, s: Shift, what: string): Shift {
  if (shiftOver(s) || s.cup.length >= CUP_SIZE) return s;
  if (!station.ingredients.some((i) => i.id === what)) return s;
  return { ...s, cup: [...s.cup, what] };
}

export const dump = (s: Shift): Shift => ({ ...s, cup: [] });

/** Whether a cup holds exactly a recipe, in any order. */
export function matches(
  cup: readonly string[],
  recipe: readonly string[],
): boolean {
  if (cup.length !== recipe.length) return false;
  const a = [...cup].sort();
  const b = [...recipe].sort();
  return a.every((x, i) => x === b[i]);
}

/** Hands the cup over for the current ticket, `waited` seconds after it
 * came in. */
export function serve(
  station: Station,
  s: Shift,
  waited: number,
): { shift: Shift; right: boolean; tip: number } {
  if (shiftOver(s)) return { shift: s, right: false, tip: 0 };
  const right = matches(s.cup, ticket(station, s.seed, s.served).recipe);
  const tip = right
    ? Math.max(0, Math.round(MAX_TIP - Math.max(0, waited) * TIP_FALLOFF))
    : 0;
  return {
    shift: {
      ...s,
      served: s.served + 1,
      right: s.right + (right ? 1 : 0),
      tips: s.tips + tip,
      cup: [],
    },
    right,
    tip,
  };
}
