// The dialogue vocabulary: role, situation, time-of-day, neighborhood and
// placeholder ids, plus the shapes of lines, conditions and role banks. The id
// lists are the single source; the union types derive from them.

/** Every NPC role with a line bank; LINE_BANKS in index.ts must cover each. */
export const ROLE_IDS = [
  "bartender",
  "bouncer",
  "dj",
  "club-dancer",
  "coat-check",
  "server",
  "regular",
  "cashier",
  "stylist",
  "nail-tech",
  "lifeguard",
  "snack-cashier",
  "swimmer",
  "ride-operator",
  "ticket-cashier",
  "carnival-barker",
  "pit-crew",
  "cotton-candy-vendor",
  "guard",
  "police",
] as const;

/** One of ROLE_IDS. */
export type DialogueRole = (typeof ROLE_IDS)[number];

/**
 * Every situation a line can be written for; a bank may leave any of them out.
 */
export const SITUATION_IDS = [
  "greeting-first",
  "greeting-regular",
  "greeting-returning",
  "tapped",
  "idle",
  "morning",
  "afternoon",
  "evening",
  "late-night",
  "weather",
  "outfit-swimsuit",
  "outfit-glam",
  "outfit-new-item",
  "outfit-matching",
  "state-drunk",
  "state-high",
  "state-tripping",
  "state-released-from-jail",
  "state-caught-shoplifting",
  "event-pride-night",
  "event-y2k-night",
  "event-latin-night",
  "event-chiptune-night",
  "event-disco-night",
  "event-foam-party",
  "event-speakeasy-night",
  "event-eighties-night",
  "event-goth-night",
  "event-rave-night",
  "event-kpop-night",
  "event-trivia-night",
  "event-open-mic-night",
  "event-drag-night",
  "event-cosmic-bowling",
  "event-ladies-night",
  "event-house-night",
  "event-luau-night",
  "event-dance-off",
  "event-ride-ended",
  "action-dancing-nearby",
  "action-ordering",
  "action-tipping",
  "action-leaving-without-paying",
  "goodbye",
] as const;

/** One of SITUATION_IDS. */
export type DialogueSituation = (typeof SITUATION_IDS)[number];

/** The four parts of the in-game day a line can be limited to. */
export const TIME_OF_DAY_IDS = [
  "morning",
  "afternoon",
  "evening",
  "late-night",
] as const;

/** One of TIME_OF_DAY_IDS. */
export type TimeOfDay = (typeof TIME_OF_DAY_IDS)[number];

/** City neighborhoods a line can be limited to. */
export const NEIGHBORHOOD_IDS = [
  "downtown",
  "nightlife-row",
  "little-manila",
  "chinatown-koreatown",
  "arts-district",
  "suburbia",
  "beachside",
  "uptown",
  "fairground",
  "hillside-winter-town",
] as const;

/** One of NEIGHBORHOOD_IDS. */
export type NeighborhoodId = (typeof NEIGHBORHOOD_IDS)[number];

/**
 * Tokens a line may contain as `{id}`; fillPlaceholders swaps them for context
 * values.
 */
export const PLACEHOLDER_IDS = ["name", "item", "place", "drink"] as const;

/** One of PLACEHOLDER_IDS. */
export type PlaceholderId = (typeof PLACEHOLDER_IDS)[number];

// A line matches only when every condition it sets matches the context.
// A condition with no matching context value never matches.
export type LineConditions = {
  neighborhood?: NeighborhoodId | readonly NeighborhoodId[];
  venue?: string | readonly string[];
  time?: TimeOfDay | readonly TimeOfDay[];
};

/**
 * A line in object form. `weight` (default 1, non-positive or non-finite also
 * counts as 1) scales how often it is picked.
 */
export type Line = {
  text: string;
  weight?: number;
  when?: LineConditions;
};

// Plain strings are the common case; use the object form for weights or conditions.
export type LineEntry = string | Line;

/**
 * One role's lines, by situation. Missing situations fall back to tapped, then
 * idle.
 */
export type RoleBank = Partial<Record<DialogueSituation, readonly LineEntry[]>>;

/**
 * What the speaker knows: placeholder values plus where and when, for matching
 * LineConditions.
 */
export type DialogueContext = {
  name?: string;
  item?: string;
  place?: string;
  drink?: string;
  neighborhood?: NeighborhoodId;
  venue?: string;
  time?: TimeOfDay;
};
