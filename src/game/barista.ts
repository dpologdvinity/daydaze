// Espresso Lab's barista shift: eight tickets come in one at a time; build
// each drink from the station (shots, milk, ice, syrups, toppings) and hand
// it over. A right drink is worth 10 and a tip for speed; a wrong one is
// worth nothing. Pure: the client keeps the clock.

export const INGREDIENTS = [
  { id: "espresso", label: "Espresso shot" },
  { id: "whole", label: "Whole milk" },
  { id: "oat", label: "Oat milk" },
  { id: "ice", label: "Ice" },
  { id: "caramel", label: "Caramel" },
  { id: "vanilla", label: "Vanilla" },
  { id: "ube", label: "Ube" },
  { id: "foam", label: "Foam" },
  { id: "cinnamon", label: "Cinnamon" },
] as const;
export type Ingredient = (typeof INGREDIENTS)[number]["id"];

export const MENU: readonly { name: string; recipe: readonly Ingredient[] }[] =
  [
    { name: "Espresso", recipe: ["espresso"] },
    { name: "Doppio", recipe: ["espresso", "espresso"] },
    { name: "Latte", recipe: ["espresso", "whole", "foam"] },
    { name: "Oat latte", recipe: ["espresso", "oat", "foam"] },
    {
      name: "Cappuccino",
      recipe: ["espresso", "whole", "foam", "foam", "cinnamon"],
    },
    {
      name: "Iced caramel latte",
      recipe: ["ice", "espresso", "whole", "caramel"],
    },
    { name: "Iced vanilla oat", recipe: ["ice", "espresso", "oat", "vanilla"] },
    { name: "Ube latte", recipe: ["espresso", "oat", "ube", "foam"] },
    {
      name: "Dirty horchata",
      recipe: ["ice", "espresso", "oat", "vanilla", "cinnamon"],
    },
  ];

export const TICKETS = 8;
/** Points for a right drink, and the most a quick one adds in tips. */
export const DRINK_POINTS = 10;
export const MAX_TIP = 5;
/** Seconds of the tip lost per second a ticket waits. */
const TIP_FALLOFF = 1 / 3;

export type Shift = {
  seed: number;
  /** Tickets handed over so far. */
  served: number;
  right: number;
  tips: number;
  /** What's in the cup now. */
  cup: readonly Ingredient[];
};

export const newShift = (seed: number): Shift => ({
  seed,
  served: 0,
  right: 0,
  tips: 0,
  cup: [],
});

/** The ticket at position `n` of a shift; one seed, one sequence. */
export function ticket(seed: number, n: number) {
  const h = Math.imul(seed ^ (n * 0x9e3779b1), 0x85ebca6b) >>> 0;
  const drink = MENU[h % MENU.length];
  if (!drink) throw new Error("empty menu");
  return drink;
}

export const shiftOver = (s: Shift) => s.served >= TICKETS;
export const score = (s: Shift) => s.right * DRINK_POINTS + s.tips;

/** Adds to the cup; at most six things fit. */
export function pour(s: Shift, what: Ingredient): Shift {
  if (shiftOver(s) || s.cup.length >= 6) return s;
  return { ...s, cup: [...s.cup, what] };
}

export const dump = (s: Shift): Shift => ({ ...s, cup: [] });

/** Whether a cup holds exactly a recipe, in any order. */
export function matches(
  cup: readonly Ingredient[],
  recipe: readonly Ingredient[],
): boolean {
  if (cup.length !== recipe.length) return false;
  const a = [...cup].sort();
  const b = [...recipe].sort();
  return a.every((x, i) => x === b[i]);
}

/** Hands the cup over for the current ticket, `waited` seconds after it
 * came in. */
export function serve(
  s: Shift,
  waited: number,
): { shift: Shift; right: boolean; tip: number } {
  if (shiftOver(s)) return { shift: s, right: false, tip: 0 };
  const right = matches(s.cup, ticket(s.seed, s.served).recipe);
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
