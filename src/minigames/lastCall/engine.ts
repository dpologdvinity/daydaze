/**
 * Last Call bar rules, ported from Club Lion's Smoothie Kitchen. Pure
 * TypeScript: no DOM, no audio, so every rule is testable in Node.
 */

import { activeTier, byTier, type ContentTier } from "../../game/age.ts";

export type IngredientId =
  | "tequila"
  | "rum"
  | "vodka"
  | "prosecco"
  | "zero_spirit"
  | "peach"
  | "passionfruit"
  | "lime"
  | "agave"
  | "mint"
  | "soda"
  | "pink_lemonade";

export type Ingredient = {
  id: IngredientId;
  label: string;
  color: string;
  spirit: boolean;
};

export const ALL_INGREDIENTS: readonly Ingredient[] = [
  { id: "tequila", label: "Tequila", color: "#f3e2b0", spirit: true },
  { id: "rum", label: "White rum", color: "#e9edf2", spirit: true },
  { id: "vodka", label: "Vodka", color: "#dfe9ff", spirit: true },
  { id: "prosecco", label: "Prosecco", color: "#f6e08a", spirit: true },
  {
    id: "zero_spirit",
    label: "Zero-proof spirit",
    color: "#c9f4e8",
    spirit: false,
  },
  { id: "peach", label: "Peach purée", color: "#ffc48a", spirit: false },
  {
    id: "passionfruit",
    label: "Passionfruit",
    color: "#f2c230",
    spirit: false,
  },
  { id: "lime", label: "Lime juice", color: "#b8e05a", spirit: false },
  { id: "agave", label: "Agave syrup", color: "#d98a2b", spirit: false },
  { id: "mint", label: "Mint", color: "#3fbf6a", spirit: false },
  { id: "soda", label: "Soda water", color: "#d7f3ff", spirit: false },
  {
    id: "pink_lemonade",
    label: "Pink lemonade",
    color: "#ff7db8",
    spirit: false,
  },
];

export type GlassId = "rocks" | "highball" | "martini" | "wine";

export const GLASSES: readonly { id: GlassId; label: string }[] = [
  { id: "rocks", label: "Rocks" },
  { id: "highball", label: "Highball" },
  { id: "martini", label: byTier("Martini", "Coupe") },
  { id: "wine", label: byTier("Wine glass", "Flute") },
];

export type GarnishId =
  | "salt_rim"
  | "lime_wheel"
  | "lemon_wheel"
  | "mint_sprig"
  | "cherry"
  | "passionfruit_half";

export const GARNISHES: readonly { id: GarnishId; label: string }[] = [
  { id: "salt_rim", label: "Salt rim" },
  { id: "lime_wheel", label: "Lime wheel" },
  { id: "lemon_wheel", label: "Lemon wheel" },
  { id: "mint_sprig", label: "Mint sprig" },
  { id: "cherry", label: "Cherry" },
  { id: "passionfruit_half", label: "Passionfruit half" },
];

export type Method = "shake" | "stir";

export type Recipe = {
  id: string;
  name: string;
  zeroProof: boolean;
  /** A multiset: a repeated id means more than one measure. */
  ingredients: readonly IngredientId[];
  glass: GlassId;
  garnish: GarnishId;
  method: Method;
  baseTip: number;
};

// Zero-proof drinks always wear a cherry so the guest can tell them apart.
export const ALL_RECIPES: readonly Recipe[] = [
  {
    id: "peach_margarita",
    name: "Peach margarita",
    zeroProof: false,
    ingredients: ["tequila", "peach", "peach", "lime", "agave"],
    glass: "rocks",
    garnish: "salt_rim",
    method: "shake",
    baseTip: 8,
  },
  {
    id: "zero_peach_margarita",
    name: "Zero-proof peach margarita",
    zeroProof: true,
    ingredients: ["zero_spirit", "peach", "peach", "lime", "agave"],
    glass: "rocks",
    garnish: "cherry",
    method: "shake",
    baseTip: 8,
  },
  {
    id: "peach_mojito",
    name: "Peach mojito",
    zeroProof: false,
    ingredients: ["rum", "peach", "lime", "mint", "soda"],
    glass: "highball",
    garnish: "mint_sprig",
    method: "stir",
    baseTip: 8,
  },
  {
    id: "zero_peach_mojito",
    name: "Zero-proof peach mojito",
    zeroProof: true,
    ingredients: ["zero_spirit", "peach", "lime", "mint", "soda"],
    glass: "highball",
    garnish: "cherry",
    method: "stir",
    baseTip: 8,
  },
  {
    id: "passionfruit_martini",
    name: "Passionfruit martini",
    zeroProof: false,
    ingredients: ["vodka", "passionfruit", "passionfruit", "peach", "lime"],
    glass: "martini",
    garnish: "passionfruit_half",
    method: "shake",
    baseTip: 9,
  },
  {
    id: "zero_passionfruit_martini",
    name: "Zero-proof passionfruit martini",
    zeroProof: true,
    ingredients: [
      "zero_spirit",
      "passionfruit",
      "passionfruit",
      "peach",
      "lime",
    ],
    glass: "martini",
    garnish: "cherry",
    method: "shake",
    baseTip: 9,
  },
  {
    id: "pink_lemonade_spritz",
    name: "Pink lemonade spritz",
    zeroProof: false,
    ingredients: ["prosecco", "prosecco", "pink_lemonade", "soda"],
    glass: "wine",
    garnish: "lemon_wheel",
    method: "stir",
    baseTip: 7,
  },
  {
    id: "zero_pink_lemonade_spritz",
    name: "Zero-proof pink lemonade spritz",
    zeroProof: true,
    ingredients: ["zero_spirit", "pink_lemonade", "pink_lemonade", "soda"],
    glass: "wine",
    garnish: "cherry",
    method: "stir",
    baseTip: 7,
  },
];

// At 13+ the bar pours only the zero-proof drinks, under mocktail names, with
// no spirits on the shelf.
const TEEN_NAMES: Record<string, string> = {
  zero_peach_margarita: "Peach limeade fizz",
  zero_peach_mojito: "Peach mint cooler",
  zero_passionfruit_martini: "Passionfruit sparkler",
  zero_pink_lemonade_spritz: "Pink lemonade fizz",
};

export function recipesFor(tier: ContentTier): readonly Recipe[] {
  if (tier === "adult") return ALL_RECIPES;
  return ALL_RECIPES.filter((r) => r.zeroProof).map((r) => ({
    ...r,
    name: TEEN_NAMES[r.id] ?? r.name,
  }));
}

export function ingredientsFor(tier: ContentTier): readonly Ingredient[] {
  if (tier === "adult") return ALL_INGREDIENTS;
  return ALL_INGREDIENTS.filter((i) => !i.spirit).map((i) =>
    i.id === "zero_spirit" ? { ...i, label: "Botanical base" } : i,
  );
}

/** The recipes and ingredients of this client's tier. */
export const RECIPES: readonly Recipe[] = recipesFor(activeTier());
export const INGREDIENTS: readonly Ingredient[] = ingredientsFor(activeTier());

export type Guest = { name: string; look: 0 | 1 | 2; hue: number };

export const GUESTS: readonly Guest[] = [
  { name: "Coco", look: 0, hue: 330 },
  { name: "Juno", look: 1, hue: 275 },
  { name: "Mika", look: 2, hue: 35 },
  { name: "Priya", look: 1, hue: 190 },
  { name: "Sasha", look: 0, hue: 300 },
  { name: "Remy", look: 2, hue: 15 },
  { name: "Lux", look: 1, hue: 250 },
  { name: "Nova", look: 0, hue: 165 },
];

export const ROUND_ORDERS = 5;
export const MAX_POURS = 6;

export type Order = { id: number; guest: Guest; recipe: Recipe };

function pick<T>(list: readonly T[], random: () => number): T {
  const index = Math.floor(random() * list.length);
  return list[Math.min(list.length - 1, Math.max(0, index))];
}

/** A round of orders; neither the drink nor the guest repeats back to back. */
export function generateOrders(
  count: number,
  random: () => number,
  recipes: readonly Recipe[] = RECIPES,
): Order[] {
  const orders: Order[] = [];
  for (let id = 0; id < count; id++) {
    const previous = orders[id - 1];
    const recipe = pick(
      recipes.filter((r) => r !== previous?.recipe),
      random,
    );
    const guest = pick(
      GUESTS.filter((g) => g !== previous?.guest),
      random,
    );
    orders.push({ id, guest, recipe });
  }
  return orders;
}

export type Drink = {
  ingredients: readonly IngredientId[];
  glass: GlassId | null;
  garnish: GarnishId | null;
};

export const EMPTY_DRINK: Drink = {
  ingredients: [],
  glass: null,
  garnish: null,
};

/** Adds one measure, unless the glass is already full. */
export function pour(drink: Drink, ingredient: IngredientId): Drink {
  if (drink.ingredients.length >= MAX_POURS) return drink;
  return { ...drink, ingredients: [...drink.ingredients, ingredient] };
}

/** Order-independent multiset comparison of the pour against the recipe. */
export function ingredientsMatch(
  recipe: Recipe,
  poured: readonly IngredientId[],
): boolean {
  if (poured.length !== recipe.ingredients.length) return false;
  const counts = new Map<IngredientId, number>();
  for (const id of recipe.ingredients) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of poured) {
    const left = counts.get(id) ?? 0;
    if (left === 0) return false;
    counts.set(id, left - 1);
  }
  return true;
}

export const METER_PERIOD_MS = 1600;

/** Needle position 0..1: a triangle wave, across and back once per period. */
export function meterPosition(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  const half = METER_PERIOD_MS / 2;
  const t = elapsedMs % METER_PERIOD_MS;
  return t <= half ? t / half : 2 - t / half;
}

export type MixQuality = "perfect" | "good" | "sloppy";

export const SWEET_SPOT = { perfect: 0.08, good: 0.2 } as const;

export function mixQualityAt(position: number): MixQuality {
  // Rounded so float noise at the window edge cannot flip the judgment.
  const off = Math.round(Math.abs(position - 0.5) * 1000) / 1000;
  if (off <= SWEET_SPOT.perfect) return "perfect";
  if (off <= SWEET_SPOT.good) return "good";
  return "sloppy";
}

export type Speed = "quick" | "steady" | "slow";

export const SPEED_MS = { quick: 15_000, steady: 25_000 } as const;

export type Verdict = {
  ingredients: boolean;
  glass: boolean;
  garnish: boolean;
  mix: MixQuality;
  speed: Speed;
  perfect: boolean;
};

export function judgeDrink(
  recipe: Recipe,
  drink: Drink,
  mix: MixQuality,
  serveMs: number,
): Verdict {
  const ingredients = ingredientsMatch(recipe, drink.ingredients);
  const glass = drink.glass === recipe.glass;
  const garnish = drink.garnish === recipe.garnish;
  const speed: Speed =
    serveMs <= SPEED_MS.quick
      ? "quick"
      : serveMs <= SPEED_MS.steady
        ? "steady"
        : "slow";
  return {
    ingredients,
    glass,
    garnish,
    mix,
    speed,
    perfect: ingredients && glass && garnish && mix === "perfect",
  };
}

export const TIP = {
  glass: 2,
  garnish: 2,
  mix: { perfect: 3, good: 1, sloppy: 0 },
  speed: { quick: 3, steady: 1, slow: 0 },
  maxStreak: 3,
} as const;

export type Tip = {
  pour: number;
  glass: number;
  garnish: number;
  mix: number;
  speed: number;
  streak: number;
  total: number;
};

/** Itemised tip. A drink with the wrong pour is sent back and tips nothing. */
export function tipFor(
  recipe: Recipe,
  verdict: Verdict,
  streakBefore: number,
): Tip {
  if (!verdict.ingredients) {
    return {
      pour: 0,
      glass: 0,
      garnish: 0,
      mix: 0,
      speed: 0,
      streak: 0,
      total: 0,
    };
  }
  const parts = {
    pour: recipe.baseTip,
    glass: verdict.glass ? TIP.glass : 0,
    garnish: verdict.garnish ? TIP.garnish : 0,
    mix: TIP.mix[verdict.mix],
    speed: TIP.speed[verdict.speed],
    streak: verdict.perfect
      ? Math.min(TIP.maxStreak, Math.max(0, streakBefore))
      : 0,
  };
  const total =
    parts.pour +
    parts.glass +
    parts.garnish +
    parts.mix +
    parts.speed +
    parts.streak;
  return { ...parts, total };
}

export type Served = { orderId: number; verdict: Verdict; tip: Tip };

export type Round = { orders: readonly Order[]; served: readonly Served[] };

export function newRound(orders: readonly Order[]): Round {
  return { orders, served: [] };
}

/** Perfect drinks in a row, counting back from the latest one served. */
export function streakOf(round: Round): number {
  let streak = 0;
  for (let i = round.served.length - 1; i >= 0; i--) {
    if (!round.served[i].verdict.perfect) break;
    streak++;
  }
  return streak;
}

/**
 * Serves the current order. Anything but the next unserved order is a stale
 * or repeated tap and returns the same round, so a drink can only pay once.
 */
export function serve(
  round: Round,
  orderIndex: number,
  drink: Drink,
  mix: MixQuality,
  serveMs: number,
): Round {
  const order = round.orders[orderIndex];
  if (!order || orderIndex !== round.served.length) return round;
  const verdict = judgeDrink(order.recipe, drink, mix, serveMs);
  const tip = tipFor(order.recipe, verdict, streakOf(round));
  return {
    ...round,
    served: [...round.served, { orderId: order.id, verdict, tip }],
  };
}

export type Grade = "S" | "A" | "B" | "C";

/** Best possible tips: every drink perfect, quick, and on a growing streak. */
export function maxTips(orders: readonly Order[]): number {
  return orders.reduce(
    (sum, order, i) =>
      sum +
      order.recipe.baseTip +
      TIP.glass +
      TIP.garnish +
      TIP.mix.perfect +
      TIP.speed.quick +
      Math.min(TIP.maxStreak, i),
    0,
  );
}

export function gradeFor(tips: number, max: number): Grade {
  if (max <= 0) return "C";
  const percent = (tips / max) * 100;
  if (percent >= 90) return "S";
  if (percent >= 75) return "A";
  if (percent >= 50) return "B";
  return "C";
}

export type Result = {
  tips: number;
  /** Drinks the guests accepted; sent-back drinks do not count. */
  served: number;
  perfect: number;
  grade: Grade;
};

/** The finished round's payout, or null while orders are still waiting. */
export function roundResult(round: Round): Result | null {
  if (round.orders.length === 0 || round.served.length < round.orders.length) {
    return null;
  }
  const tips = round.served.reduce((sum, s) => sum + s.tip.total, 0);
  return {
    tips,
    served: round.served.filter((s) => s.verdict.ingredients).length,
    perfect: round.served.filter((s) => s.verdict.perfect).length,
    grade: gradeFor(tips, maxTips(round.orders)),
  };
}
